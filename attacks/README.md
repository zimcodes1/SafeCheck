# SafeCheck Attack Suite & Threat Demonstrations

All attack scripts speak standard **Modbus TCP** directly to the plant or proxy. They never invoke internal backend APIs, mimicking external adversaries on the operational technology (OT) network.

Each script binds a fixed source port to simulate distinct network endpoints visible to the passive sensor and mirror tap:

- **Injection**: `127.0.0.1:6002`
- **Wrong Moment**: `127.0.0.1:6003`
- **Slow Drift**: `127.0.0.1:6004`
- **Replay**: `127.0.0.1:6005`
- **Maintenance**: `127.0.0.1:6006`
- **Malformed Packet**: `127.0.0.1:6007`

---

## Quick Reference & Commands

Run all scripts from the `attacks/` directory using the `uv` environment:

```bash
cd attacks

# 1. Unsolicited Command Injection
uv run python -m injection.run

# 2. Command at the Wrong Moment (Context-Aware Layer-2 Violation)
uv run python -m wrong_moment.run

# 3. Slow Drift / Underperformance (Context-Aware Layer-4 Anomaly)
uv run python -m slow_drift.run --duration 20

# 4. Legitimate Maintenance Activity (Expected Safe Behavior)
uv run python -m maintenance_scenario.run --cycles 3

# 5. Malformed Modbus Packets (Layer-1 Sanity Violations)
uv run python malformed_packet/attack.py --case bad-protocol
uv run python malformed_packet/attack.py --case bad-function
uv run python malformed_packet/attack.py --case bad-register
```

---

## Expected Detection Results

| Script                 | Rule Triggered  | Severity | Confidence   | Description                                                                        |
| :--------------------- | :-------------- | :------- | :----------- | :--------------------------------------------------------------------------------- |
| `injection`            | Recorded in DB  | INFO     | CERTAIN      | Unsolicited command logged and flagged from source `127.0.0.1:6002`.               |
| `wrong_moment`         | `state_machine` | CRITICAL | CERTAIN      | Reaffirms pump ON while tank is in the danger zone ($\ge 95\%$) with valve closed. |
| `slow_drift`           | `drift`         | WARNING  | NEEDS_REVIEW | Holds valve open during fill cycle; flags sustained sluggish rise (< 0.02%/s).     |
| `malformed_packet`     | `sanity_check`  | WARNING  | CERTAIN      | Invalid MBAP protocol ID, illegal function codes, or out-of-range registers.       |
| `replay`               | `replay`        | WARNING  | NEEDS_REVIEW | Sensor telemetry frozen while pump is actively engaged with valve closed.          |
| `maintenance_scenario` | _None_          | _None_   | _None_       | Routine scheduled maintenance commands; clean state transitions.                   |

---

## The Replay Attack: Real-Life Concept vs. Local Simulation

### 1. What Happens in a Real-Life Industrial Attack?

In operational control systems (ICS/SCADA), an adversary executing a **Sensor Telemetry Replay Attack** (famously demonstrated by **Stuxnet**) aims to blind human operators and automated safety monitors. The attacker feeds pre-recorded "normal" sensor data back to the control room while secretly sabotaging physical machinery.

In a real industrial facility:

1. **The SCADA server never changes ports or configurations.** It continues querying what it believes is the real PLC on port `5020`.
2. **The attacker establishes a Man-in-the-Middle (MITM) position on the OT network** using one of several standard techniques:
   - **ARP Cache Poisoning / Spoofing**: The attacker sends forged ARP responses across the local industrial Ethernet switch. The SCADA server's network stack routes packets destined for the PLC's IP directly to the attacker's network interface.
   - **Compromised Field Gateway**: In facilities where serial Modbus RTU devices connect via Ethernet gateways (e.g., Moxa, Siemens), attackers compromise vulnerable gateway firmware to alter polling responses.
   - **Router / Firewall NAT Redirection**: With access to a network switch or industrial gateway, transparent port forwarding (`iptables -t nat -A PREROUTING -p tcp --dport 5020 -j REDIRECT --to-ports 15020`) intercepts packets without client-side knowledge.
   - **DNS / Hosts Poisoning**: SCADA pollers querying hostnames (e.g., `tank-plc.plant.local`) are poisoned to resolve to the attacker's interceptor.
3. The attacker's interceptor transparently forwards operational commands to the real hardware, captures a steady-state sensor reading, and then loops (replays) that frozen reading to the SCADA poller while actuating destructive commands underneath.

### 2. Why Does Our Local Setup Use a Separate Port (`15020`)?

In our demonstration environment, all 4 components (Plant, Backend, Frontend, and Attacks) run concurrently on a **single Linux machine using local loopback (`127.0.0.1`)**.

Because local loopback lacks physical Ethernet framing, network switches, and ARP tables:

- An unprivileged user cannot perform Layer-2 ARP poisoning on `lo`.
- Opening a dedicated local listener on port `15020` serves as the **software representation of the attacker's MITM interception proxy**.
- In an academic/evaluator defense, this demonstrates the exact same protocol-level vulnerability: Modbus TCP lacks message authentication, session tokens, and cryptographic timestamps, making it vulnerable to telemetry replay.

---

## Step-by-Step: Running the Replay Attack Demonstration

To run the full end-to-end telemetry replay demonstration:

### Step 1: Ensure Plant and Legitimate Client Are Running

Ensure the Plant is running on port `5020` (e.g. via `./start.sh` or standalone `cd plant && uv run python run.py`).

### Step 2: Start the Replay MITM Proxy

In the `attacks/` directory, launch the replay proxy:

```bash
cd attacks
uv run python -m replay.run --listen-port 15020
```

The proxy will start, announce `REPLAY_ARMED`, and wait for the backend poller to connect.

### Step 3: Point the Backend Poller to the Intercepted Port

In a separate terminal, launch the backend configured to communicate through the proxy:

```bash
cd backend
PLANT_PORT=15020 uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

_(Alternatively, set `PLANT_PORT=15020` in `backend/.env` before starting the backend)._

### Step 4: Observe the Replay Strike & Layer-3 Detection

1. The backend connects to `127.0.0.1:15020`.
2. The proxy captures the first live sensor reading response (e.g., water level at 50%) and arms the trap.
3. The attack client connects directly to the real plant (`5020`) and forces a covert drain (`begin_hidden_drain`).
4. While the physical plant changes state, the proxy continues feeding the frozen 50% snapshot back to the backend.
5. Within ~5 seconds, the SafeCheck detection engine detects that the pump is active but the reported water level has remained frozen, raising **Alert (Layer 3 — REPLAY)**:
   > _"Sensor anomaly: pump has been continuously active with valve closed but water level remained frozen (variation 0.00 over 5 samples). Possible sensor replay, transmission failure, or device hang."_
6. The alert and toast notification immediately appear on the React dashboard.

---

## Alternative: Programmatic Scenario Verification

SafeCheck also provides a built-in automated test harness that exercises the Layer-3 Replay detection logic deterministically without manual proxy orchestration:

```bash
# Run all detector unit & scenario tests (including Layer 3 Replay):
cd backend
uv run python scripts/simulate_all.py

# Or trigger the scenario on demand via the REST API:
curl -X POST http://127.0.0.1:8000/api/simulate/scenario?name=replay_stuck
```
