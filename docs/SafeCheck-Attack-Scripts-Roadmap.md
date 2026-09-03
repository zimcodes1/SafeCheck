# SafeCheck — Attack Scripts Development Roadmap

This is a standalone build plan for `attacks/`, matching the detail level of the Backend Roadmap — small snippets where a shape helps, everything else described in prose, each step building directly on the one before. Unlike the Backend Roadmap, this isn't tied to calendar days, since this component is small and you need it working quickly to start exercising the Detector.

**Dependency note up front:** a few steps below need specific Backend endpoints to already exist to be *fully* useful (self-reporting to `/commands/report` needs Backend Day 8; getting real alerts back needs Backend Day 12 for Layer 1–2, and Day 14 for Layer 3–4). Every step is still buildable and independently testable against a running Plant even before those exist — you'll just be watching the Plant's raw register values change rather than seeing alerts come back, until the Backend catches up. Structure your own work so the Plant-facing half of each script is solid first, then wire in reporting once the corresponding Backend day is done.

---

## Step 1 — Shared config

**Builds on:** the empty scaffold folders, and the Plant's `register_map.md` — this is the first file to read before writing anything here.
**Files:** `attacks/common/config.py`

Every value every script needs: Plant host/port (must match `plant_server/config.py`'s port exactly), the Backend URL, and the danger threshold used to time the Wrong Moment attack — this last one matters, since that attack needs to know roughly where "near the threshold" is, and it should read the same value the Plant/Backend use, not a separately guessed number.

```python
# attacks/common/config.py — shape only
class AttackConfig:
    plant_host: str = "127.0.0.1"
    plant_port: int = 5020
    backend_url: str = "http://127.0.0.1:8000"
    danger_level_threshold: float = 95.0
```

**Done when:** the file imports cleanly — nothing runs yet.

---

## Step 2 — Connection and register-read helper

**Builds on:** Step 1's config, the Plant server already being runnable (Plant Roadmap Increment 9).
**Files:** `attacks/common/client_helper.py`

Build `connect_to_plant()`, opening a Modbus connection to the Plant using Step 1's host/port, and `read_plant_registers()`, returning the current water level, pump status, and valve status as plain values — every attack script that needs to "watch and wait" for a moment to act depends on this.

**Done when:** a throwaway test call to `read_plant_registers()` against a running Plant returns real, current values.

---

## Step 3 — Command-sending and self-reporting helper

**Builds on:** Step 2's connection helper. This is the shared piece every attack script will call to actually *act*, so get it right once here rather than repeating it five times.
**Files:** `attacks/common/client_helper.py` (same file, extended)

Build `report_command(command_type, value, source_id)`, responsible for two things together: writing the command to the Plant's holding register via Modbus, **and** POSTing the same command to the Backend's `/commands/report` endpoint with the given `source_id` — matching the self-reporting design decision from the Data Models & Endpoints Guide. If the Backend call fails (e.g., because it isn't built yet, or isn't running), catch that gracefully and log it — the Modbus half should still succeed independently, since that's the half that actually affects the Plant.

```python
# attacks/common/client_helper.py — shape only
def report_command(command_type: str, value: bool, source_id: str) -> None:
    ...  # write to Plant register, then POST to /commands/report
```

**Done when:** calling `report_command("pump", True, "test_source")` against a running Plant *and* a running Backend produces both a real register change on the Plant and a new row in the Backend's `commands` table. Test with the Backend temporarily stopped too, to confirm the failure is logged, not crashing.

---

## Step 4 — Injection attack (build this one first — it's the simplest)

**Builds on:** Step 3's `report_command()`.
**Files:** `attacks/injection/attack.py`, `attacks/injection/run.py`

Build `run_injection()`, responsible for sending a single unsolicited command directly via `report_command()`, with `source_id = "attack_injection"`. No waiting, no watching state — it just fires.

**Done when:** running this against a live Plant produces an immediate, visible register change, and — once Backend Day 12 exists — a `Command` row tagged with the right source. This is your first real end-to-end test of the whole pipeline, so confirm it thoroughly before moving on.

---

## Step 5 — Wrong Moment attack

**Builds on:** Step 2's `read_plant_registers()`, Step 3's `report_command()`, Step 1's danger threshold config.
**Files:** `attacks/wrong_moment/attack.py`, `attacks/wrong_moment/run.py`

Build `run_wrong_moment()`, responsible for polling `read_plant_registers()` in a loop until **both** conditions are true — water level near `danger_level_threshold` **and** the valve currently closed — then sending "pump on" via `report_command()` with `source_id = "attack_wrong_moment"`. This is the corrected version of the rule from the last discussion: waiting on the water-level condition too, not just the valve state, is what makes this a genuine attack rather than a coincidence of normal filling.

**Done when:** running this against a Plant that's been left to fill up (or manually nudged close to the threshold) correctly waits for the right moment and then fires — confirmed by watching the water level at the point the command is sent. Once Backend Day 12 is done, confirm this specific scenario produces a `Warning`/`Critical` alert.

---

## Step 6 — Slow Drift attack

**Builds on:** Step 3's `report_command()`.
**Files:** `attacks/slow_drift/attack.py`, `attacks/slow_drift/run.py`

Build `run_slow_drift()`, responsible for sending many small, incremental commands over time with short pauses between them (e.g., repeatedly toggling the valve briefly, or extending how long the pump stays on each cycle by a small amount each pass) — with `source_id = "attack_slow_drift"` — such that no single command looks unusual, but the cumulative effect over several minutes pushes the water level toward the danger zone.

**Done when:** running this for an extended stretch (several minutes) produces a visible upward trend in water level with no single dramatic jump — confirmed by watching the readings over time. Once Backend Day 14 is done, confirm the cumulative trend triggers Layer 4, not Layer 1–2.

---

## Step 7 — Replay attack

**Builds on:** Step 2's register-reading helper, Step 5's pattern for waiting on state — this is the most involved script, build it after the simpler ones are solid.
**Files:** `attacks/replay/attack.py`, `attacks/replay/run.py`

Build two functions: `capture_snapshot()`, responsible for recording a real "everything normal" set of input register values at a safe moment, and `run_replay(snapshot)`, responsible for repeatedly overwriting the Plant's input registers with that frozen snapshot — while, at the same time, separately sending a real "open valve" command via `report_command()` (`source_id = "attack_replay"`) so the tank is genuinely draining underneath the frozen reading. This pairing is what makes the attack match the track brief exactly: the reported state says "all fine," the real tank is emptying.

**Note:** this script writes to input registers directly, unlike every other script here which only writes to holding (command) registers — worth a comment in the file itself explaining this is simulating an intercepted feed, not a real Modbus capability being exploited.

**Done when:** running this shows the Plant's *real* water level dropping (confirmed by reading the true underlying `TankState` some other way, e.g. a debug log on the Plant side) while the input registers a normal client would read stay frozen at the captured snapshot. Once Backend Day 14 is done, confirm Layer 3 catches the mismatch.

---

## Step 8 — Maintenance scenario

**Builds on:** Step 3's `report_command()`. Build this after the four real attacks, since its purpose is proving the Detector *doesn't* overreact — you need real detection logic in place first for this test to mean anything.
**Files:** `attacks/maintenance_scenario/scenario.py`, `attacks/maintenance_scenario/run.py`

Build `run_maintenance()`, responsible for the defined legitimate-maintenance behavior: valve opened and closed several times in a short window, with the pump deliberately kept off throughout — `source_id = "maintenance_technician"`.

**Done when:** running this alongside a Backend with all four Detector layers active (Backend Day 14+) produces no `Warning`/`Critical` alerts — only `Info` at most. This is your false-positive evidence for the write-up, so run it for a genuinely realistic stretch (several minutes), not just a couple of toggles.

---

## Step 9 — Full attack suite integration pass

**Builds on:** everything above, plus a fully working Backend (through at least Day 17) and Plant.
**Files:** none — this is a test pass.

Run every attack script individually against a fresh Plant + Backend, confirming each produces the expected alert type and severity. Then run the Legit Client and the Maintenance scenario together for an extended stretch, confirming neither produces a false alarm. Then run one attack *simultaneously* with the Legit Client running normally, confirming the Detector still catches it amid ordinary traffic.

**Done when:** you have a documented, repeatable set of results — which attack triggered which layer, at what severity, and confirmation the maintenance/legit traffic stayed clean — this is your actual evidence for the "explain your results honestly" requirement, and it's also exactly what you'll walk judges through live.
