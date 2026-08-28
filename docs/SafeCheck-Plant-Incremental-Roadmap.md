# SafeCheck — Plant Server & Legit Client Incremental Roadmap

This covers `plant_server/` and `legit_client/` together, since the second depends entirely on the first existing. Unlike the Backend roadmap, this isn't tied to calendar days — it's a strict sequence of increments, each one producing something runnable and testable before the next begins. Don't skip ahead: increment 6 (real physics) is meaningless to build before increment 5 (real register wiring) works, and increment 9 (Legit Client) has nothing to talk to until the Plant server itself is solid.

---

## Increment 1 — Config and environment skeleton

**Builds on:** the empty scaffold folders from the groundwork doc.
**Files:** `plant_server/config.py`

Every value the Plant needs to run — the port it listens on, how often it ticks, the danger-condition thresholds — goes here, read from environment variables with sensible defaults. Nothing else in the codebase should hardcode a port number or a threshold directly.

```python
# plant_server/config.py — shape only
class PlantConfig:
    modbus_port: int = 5020
    tick_interval_seconds: float = 1.0
    danger_level_threshold: float = 95.0
    danger_pump_valve_seconds: int = 5
```

**Done when:** the file imports cleanly with no errors — nothing runs yet, this just defines the values everything else will read.

---

## Increment 2 — The register map, written down and shared

**Builds on:** Increment 1's port config; also the register map already agreed as a shared contract per earlier docs.
**Files:** `register_map.md`, `plant_server/registers.py`

Write the register map out as plain documentation first — the same table from the Implementation Plan (holding registers 0–1 for commands, input registers 0–2 for readings) — then express it as named constants in `registers.py`, so nothing elsewhere in the codebase ever refers to a register by a bare number.

```python
# plant_server/registers.py — shape only
PUMP_COMMAND_REGISTER = 0     # holding register
VALVE_COMMAND_REGISTER = 1    # holding register
WATER_LEVEL_REGISTER = 0      # input register
PUMP_STATUS_REGISTER = 1      # input register
VALVE_STATUS_REGISTER = 2     # input register
```

**Done when:** `register_map.md` is complete and has been read by the whole team (this is the single most important artifact in the entire Plant component — a silent mismatch here breaks Backend, Attacks, and the Dashboard all at once, without any of them throwing an obvious error).

---

## Increment 3 — `TankState`: the data shape, no behavior yet

**Builds on:** nothing except plain Python — deliberately built before any Modbus code touches it, so it can be reasoned about and tested on its own.
**Files:** `plant_server/physics.py`

Define the structure holding the Plant's actual state: `water_level`, `pump_state`, `valve_state`. No `tick()` logic yet — just the shape, so later increments have something concrete to operate on.

```python
# plant_server/physics.py — shape only
class TankState:
    water_level: float = 0.0
    pump_state: bool = False
    valve_state: bool = False
```

**Done when:** you can create a `TankState` instance manually (e.g., in a quick throwaway script) and read/set its fields — nothing dynamic yet, just confirming the shape is usable.

---

## Increment 4 — Modbus server skeleton, static values only

**Builds on:** Increment 2's register constants, Increment 1's port config.
**Files:** `plant_server/modbus_server.py`

Get a Modbus TCP server actually running and listening on the configured port, with the registers from Increment 2 wired up — but returning fixed, hardcoded placeholder values for now (e.g., water level always reads as `50`). The goal here is purely proving the server starts and a client can connect and read something, before any real state is involved.

**Done when:** any basic Modbus client (a throwaway test script, or a tool like `pymodbus`'s own console client) can connect to the server on the configured port and successfully read back the placeholder values from each register address in `registers.py`.

---

## Increment 5 — Wire real reads/writes to `TankState`

**Builds on:** Increment 3's `TankState` shape, Increment 4's working server.
**Files:** `plant_server/modbus_server.py`

Replace the hardcoded placeholder values from Increment 4 with real reads from a live `TankState` instance — reading the holding registers should reflect whatever was last written to `pump_state`/`valve_state` by a client, and reading the input registers should reflect the current `water_level`/`pump_state`/`valve_state`. Still no physics — writing "pump on" just flips the boolean, it doesn't yet make the water level change over time.

**Done when:** connecting a test client, writing `1` to the pump command register, then reading the pump status register back correctly shows the updated value — proving the round-trip works before any physics is layered on top.

---

## Increment 6 — Real tick physics

**Builds on:** Increment 5's working read/write wiring.
**Files:** `plant_server/physics.py`

Add a `tick()` method to `TankState`, responsible for adjusting `water_level` based on the current `pump_state`/`valve_state` — pump raises it, valve lowers it, both together mostly offset. Keep this method entirely free of any Modbus knowledge; it should only ever operate on plain values, which makes it trivial to test on its own without a running server at all.

**Done when:** calling `tick()` repeatedly on a `TankState` instance with `pump_state = True` produces a steadily rising `water_level`, and with `valve_state = True` (pump off) produces a steadily falling one — confirmed with a simple standalone test, no Modbus involved yet.

---

## Increment 7 — Wire the tick loop into the running server

**Builds on:** Increment 5's real register wiring, Increment 6's `tick()` method.
**Files:** `plant_server/modbus_server.py`

On the interval from `config.py`, call `tick()` on the live `TankState` before refreshing the input registers — this is the point where the Plant genuinely comes alive and starts changing on its own, independent of any client interaction.

**Done when:** connecting a test client, writing "pump on," then polling the water level register every second shows it visibly rising over time with no further commands sent — the physics is now live and continuous.

---

## Increment 8 — Danger condition detection

**Builds on:** Increment 6's `tick()`, since the danger condition depends on the same state it operates on.
**Files:** `plant_server/physics.py`

Add danger-condition checking into `TankState` — using the thresholds from `config.py` (Increment 1), detect when pump is on and valve is closed for longer than the configured tolerance, or when water level is at/near 100 with the valve closed. This doesn't need to *do* anything yet (no alerting lives here — that's the Backend's Detector, a separate system entirely) — it just needs to be a fact the state can report about itself, e.g., an `is_in_danger` property or similar, useful for your own testing and for the Plant's own console output.

**Done when:** manually driving a `TankState` into the danger condition (pump on, valve closed, several ticks passed) correctly reports the danger flag as true, and a normal running state correctly reports false.

---

## Increment 9 — `run.py`: the real entry point

**Builds on:** everything above — this is just the piece that starts it all.
**Files:** `plant_server/run.py`

A thin script that imports the server module and starts it running indefinitely, this is what gets executed from the command line (or referenced in the root README's "how to run everything" instructions).

**Done when:** running this one file, with no other manual setup, brings up a fully working, physically-behaving Plant — this is the artifact the rest of the team (Backend, Attacks, Dashboard) will actually run against from here on.

**Checkpoint:** everything through Increment 9 makes the Plant server itself feature-complete and independently demoable on its own — a client can connect, send commands, and watch realistic tank behavior unfold, entirely without the Legit Client or any Backend component existing yet.

---

## Increment 10 — Legit Client: config and connection only

**Builds on:** Increment 9's working, runnable Plant server — there's nothing to build against before this exists.
**Files:** `legit_client/config.py`

Plant host/port (matching Increment 1's server config), plus a placeholder for the Backend URL (not used yet — that comes later). Confirm the Legit Client folder can successfully open a Modbus connection to the running Plant, with no real operator behavior yet — just proving connectivity.

**Done when:** a minimal connect-and-disconnect script in this folder successfully talks to the Plant server from Increment 9.

---

## Increment 11 — The operator cycle, local only

**Builds on:** Increment 10's working connection.
**Files:** `legit_client/operator.py`

Build `run_operator_cycle()`, responsible for a believable sequence of normal behavior — pump on, wait, pump off, valve open, wait, valve closed, repeat — sending each command directly to the Plant via Modbus. No Backend reporting yet at this stage; the goal is purely proving the behavior itself looks like a real operator when watched live against the Plant.

**Done when:** running this against the live Plant server produces a visibly sensible pattern of tank behavior over a few minutes — rising, falling, never hitting the danger condition — confirmed just by watching the raw register values change (a throwaway polling script is enough for this check, before any Dashboard exists).

---

## Increment 12 — Backend command reporting

**Builds on:** Increment 11's working local cycle. **Also requires** the Backend's `/commands/report` endpoint to exist (Backend Roadmap, Day 8) — this is the first point where Plant work has a hard dependency on Backend work being ready.
**Files:** `legit_client/operator.py`, `legit_client/config.py`

Add a call to the Backend's `/commands/report` endpoint alongside every command already being sent to the Plant, using `source_id = "legit_operator"` — matching the self-reporting design decision from the Data Models & Endpoints Guide.

**Done when:** running the full cycle against both a live Plant and a live Backend produces real `Command` rows in the Backend's database, correctly labeled, matching what was actually sent to the Plant at the same moments.

---

## Increment 13 — `run.py` for the Legit Client

**Builds on:** Increment 12.
**Files:** `legit_client/run.py`

The entry point — runs the operator cycle indefinitely, the same way `plant_server/run.py` does for the Plant.

**Done when:** running this one file, with the Plant and Backend both already running, produces a continuous, self-sustaining stream of realistic "normal operation" data with no further manual input needed.

---

## Increment 14 — Robustness pass

**Builds on:** everything above — this is a review increment, not new features.
**Files:** revisit `plant_server/modbus_server.py`, `legit_client/operator.py`

Confirm reasonable behavior in the situations most likely to actually happen during a live demo:
- A client disconnects mid-session — the Plant server shouldn't crash, it should just keep running for whoever reconnects next.
- The Backend is temporarily unreachable when the Legit Client tries to report a command — this shouldn't crash the operator loop; log the failure and keep going, since the Plant/Modbus side of the command still succeeded regardless.
- The Plant is restarted mid-demo — confirm it comes back up cleanly at a sensible default state (e.g., empty tank, pump/valve off), not whatever it happened to be at when it stopped.

**Done when:** you've deliberately caused each of the three situations above at least once and confirmed the system recovers or degrades gracefully rather than crashing outright.

---

## Increment 15 — Final integration confirmation

**Builds on:** everything — this is the last check before handing this component off as "done" for the team to build Attacks and the Dashboard against with confidence.
**Files:** none — this is a test pass, not new code.

Run the Plant and Legit Client together, continuously, for an extended stretch (10+ minutes) alongside a running Backend, and confirm: tank behavior stays realistic throughout, no crash, no register mismatch, `Command` and `Reading` rows in the Backend's database tell a consistent, sensible story when reviewed afterward, and the danger condition from Increment 8 never falsely triggers during purely normal operation.

**Done when:** you'd be comfortable handing this exact running setup to the Attacks-script builder and the Dashboard builder, confident that anything unusual they see afterward is caused by their own work, not by an unresolved issue in the Plant itself.
