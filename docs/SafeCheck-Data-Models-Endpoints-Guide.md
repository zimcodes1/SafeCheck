# SafeCheck — Data Models, Endpoints & Directory Structure Guide

This document extends the scaffold: instead of empty placeholder folders, it lays out exactly which files each of the Backend, Plant, and Attacks components should contain, what each file is responsible for, and the exact shape of every data model and API endpoint. Everything is described as **structure and responsibility, not implementation** — function names and what they're for, not the logic inside them — so the team writes the actual code themselves, in the order laid out in Section 6.

A design decision worth flagging up front, since it affects several files below: **commands are self-reported.** Rather than having the Backend try to sniff Modbus traffic to figure out who sent what (which is fiddly and not what the track is testing), every client that sends a command to the Plant — the Legit Client and each Attack script — also tells the Backend directly, via a small API call, what it just sent and who it claims to be. This is exactly the "identity tagging, not real authentication" approach from the Implementation Plan: the source name is self-declared, not verified, same as Modbus itself provides no verification.

---

## 1. Backend — Directory Structure

```
backend/
├── requirements.txt
├── safecheck.db                     ← generated automatically, not committed
├── .env                             ← not committed (see .env.example at repo root)
└── app/
    ├── main.py
    ├── config.py
    ├── database.py
    │
    ├── models/
    │   ├── __init__.py
    │   ├── reading.py
    │   ├── command.py
    │   └── alert.py
    │
    ├── schemas/
    │   ├── __init__.py
    │   ├── plant.py
    │   ├── reading.py
    │   ├── command.py
    │   └── alert.py
    │
    ├── routes/
    │   ├── __init__.py
    │   ├── plant.py
    │   ├── history.py
    │   ├── commands.py
    │   ├── alerts.py
    │   └── simulate.py
    │
    ├── services/
    │   ├── __init__.py
    │   ├── modbus_client.py
    │   └── poller.py
    │
    └── detector/
        ├── __init__.py
        ├── layer1_sanity.py
        ├── layer2_state_machine.py
        ├── layer3_replay.py
        ├── layer4_drift.py
        └── engine.py
```

### File-by-file responsibilities

**`main.py`** — Creates the FastAPI app. Registers all five routers (`plant`, `history`, `commands`, `alerts`, `simulate`). Runs `database.init_db()` on startup so the SQLite file and tables exist before anything else runs. Starts the background poller (from `services/poller.py`) as a scheduled task on startup, so readings begin flowing the moment the Backend launches.

**`config.py`** — Single place holding every configurable value: Plant host/port, Backend port, database file path, polling interval, and any detector thresholds (e.g., the drift window length, the danger-condition level). Reads from environment variables with sensible defaults, so no value is hardcoded elsewhere in the app.

**`database.py`** — Sets up the SQLite connection and session handling. Contains `init_db()`, responsible for creating all tables from the model definitions if they don't already exist, and `get_session()`, a reusable way for routes and services to get a database session without repeating connection setup everywhere.

### `models/` — the ORM table definitions (one file per table, matching Section 2 below)

**`reading.py`** — Defines the `Reading` table.
**`command.py`** — Defines the `Command` table.
**`alert.py`** — Defines the `Alert` table, including its relationship back to `Command`.

### `schemas/` — the API-facing shapes (what goes over HTTP, separate from the database models)

**`plant.py`** — `PlantLiveResponse`: the shape returned by the live-state endpoint.
**`reading.py`** — `ReadingOut`: the shape of a single historical reading returned by the history endpoint.
**`command.py`** — `CommandIn` (what a client sends when reporting a command it issued) and `CommandOut` (what's returned when listing command history).
**`alert.py`** — `AlertOut` (summary shape for the alert feed) and `AlertDetail` (full shape including the related command, for the expanded view).

### `routes/` — one file per group of endpoints, detailed fully in Section 3

**`plant.py`**, **`history.py`**, **`commands.py`**, **`alerts.py`**, **`simulate.py`** — each contains the route functions for that group, described endpoint-by-endpoint in Section 3.

### `services/` — logic that isn't tied to a single HTTP request

**`modbus_client.py`** — The Backend's own Modbus client, used to read the Plant's current input registers. Contains `read_plant_state()`, returning the current water level, pump status, and valve status as plain values, ready to be shaped into a schema or written as a `Reading` row.

**`poller.py`** — Runs on a repeating timer (matching the interval in `config.py`). Contains `poll_once()`, responsible for: calling `read_plant_state()`, saving the result as a new `Reading` row, and handing the new reading off to the Detector engine (`detector/engine.py`) for the reading-based checks (replay, drift). This is what keeps the `readings` table populated continuously without any endpoint being called.

### `detector/` — the four layers plus the orchestrator, matching the Implementation Plan Section 8.4

**`layer1_sanity.py`** — Contains `check_sanity(command)`, responsible for validating a single incoming command is well-formed and within range.

**`layer2_state_machine.py`** — Contains `check_state_validity(command, current_plant_state)`, responsible for looking up whether the incoming command is safe given the Plant's state at the moment it arrived. Also holds the state/command lookup table itself as a simple structure in this file, so it's easy to find and edit as the team refines what counts as "unsafe."

**`layer3_replay.py`** — Contains `check_for_replay(new_reading, recent_readings)`, responsible for comparing a new reading against recent history to spot suspiciously repeated values given the Plant's active state.

**`layer4_drift.py`** — Contains `check_for_drift(recent_readings, window)`, responsible for tracking cumulative change over the configured rolling window and flagging when the total crosses a threshold.

**`engine.py`** — The orchestrator. Contains `evaluate_command(command)` (runs Layers 1–2, called the moment a command is reported) and `evaluate_reading(reading)` (runs Layers 3–4, called by the poller after each new reading). Both functions are responsible for creating an `Alert` row when a layer flags something, including picking the right severity and writing the plain-language message.

---

## 2. Backend — Data Models (Detailed)

### `Reading` (table: `readings`)

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | primary key, auto-increment | |
| `timestamp` | datetime | not null, default = now | |
| `water_level` | float | not null, 0–100 | |
| `pump_state` | boolean | not null | |
| `valve_state` | boolean | not null | |
| `source` | string | not null, default `"plant"` | Kept for consistency, always `"plant"` for now — readings only ever come from polling the Plant directly |

### `Command` (table: `commands`)

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | primary key, auto-increment | |
| `timestamp` | datetime | not null, default = now | |
| `command_type` | string | not null, one of `"pump"` / `"valve"` | |
| `value` | boolean | not null | |
| `source_id` | string | not null | Self-declared by whichever client reports it, e.g. `"legit_operator"`, `"attack_injection"` |
| `flagged` | boolean | not null, default `false` | Set to `true` by the Detector if any layer raises an alert tied to this command |

### `Alert` (table: `alerts`)

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | primary key, auto-increment | |
| `timestamp` | datetime | not null, default = now | |
| `severity` | string | not null, one of `"info"` / `"warning"` / `"critical"` | |
| `rule_triggered` | string | not null, one of `"sanity_check"` / `"state_machine"` / `"replay"` / `"drift"` | |
| `related_command_id` | integer | nullable, foreign key → `commands.id` | Null for reading-based alerts (replay/drift) that aren't tied to one specific command |
| `message` | string | not null | The plain-language sentence shown on the Dashboard |
| `confidence` | string | not null, one of `"certain"` / `"needs_review"` | |

**Relationship summary:** `Alert.related_command_id` points to `Command.id`. A `Command` can have zero or one directly-related alert reference from Layers 1–2; Layers 3–4 alerts relate to a time window of `Reading` rows instead, so `related_command_id` stays null for those — the timestamp is enough to correlate them visually on the Dashboard.

---

## 3. Backend — Endpoints (Detailed)

### `routes/plant.py`

**`GET /plant/live`**
- **Purpose:** Current Plant state, for the Dashboard's live view polling.
- **Request:** none.
- **Response (`PlantLiveResponse`):** `water_level` (float), `pump_state` (bool), `valve_state` (bool), `timestamp` (datetime).
- **Behavior note:** reads directly via `services/modbus_client.py`, does **not** read from the database — this must reflect the true current instant, not the last polled row.

### `routes/history.py`

**`GET /history/readings`**
- **Purpose:** Historical readings for charting/replay.
- **Query params:** `start` (datetime, optional), `end` (datetime, optional), `limit` (int, optional, default e.g. 500).
- **Response:** list of `ReadingOut` (`id`, `timestamp`, `water_level`, `pump_state`, `valve_state`).

**`GET /history/commands`**
- **Purpose:** Historical commands, including flag status.
- **Query params:** same as above.
- **Response:** list of `CommandOut` (`id`, `timestamp`, `command_type`, `value`, `source_id`, `flagged`).

### `routes/commands.py`

**`POST /commands/report`**
- **Purpose:** The single point where the Legit Client and every Attack script tell the Backend what they just sent to the Plant. This is what populates the `commands` table and is what triggers Layer 1–2 detection immediately.
- **Request (`CommandIn`):** `command_type` (`"pump"`/`"valve"`), `value` (bool), `source_id` (string).
- **Response:** the created `CommandOut`, **plus** an optional `alert` field containing the `AlertOut` if this command immediately triggered one — this lets an attack script's own console output show, in real time, whether it just got caught, which is genuinely useful for your own testing during Week 2.
- **Behavior note:** this endpoint is responsible for calling `detector/engine.py`'s `evaluate_command()` synchronously before responding, so the caller gets an immediate answer rather than having to poll `/alerts` separately.

### `routes/alerts.py`

**`GET /alerts`**
- **Purpose:** Powers the Dashboard's alert feed.
- **Query params:** `severity` (optional filter), `limit` (optional, default e.g. 100).
- **Response:** list of `AlertOut` (`id`, `timestamp`, `severity`, `rule_triggered`, `message`, `confidence`), most recent first.

**`GET /alerts/{id}`**
- **Purpose:** Full detail view when a Dashboard user clicks into one alert.
- **Response (`AlertDetail`):** everything in `AlertOut`, plus the full related `CommandOut` if `related_command_id` isn't null.

### `routes/simulate.py` *(optional, build last, only if time allows)*

**`POST /simulate/scenario`**
- **Purpose:** Demo-day convenience — trigger a named scenario without manually running a separate script in front of judges.
- **Request:** `scenario_name` (string, one of the defined scenario names, e.g. `"maintenance"`, `"wrong_moment_attack"`).
- **Response:** confirmation that the scenario was started.
- **Note:** this endpoint's job is just to kick off the corresponding script as a background process — it shouldn't contain any scenario logic itself, that all lives in `attacks/`.

---

## 4. Plant — Directory Structure

```
plant/
├── requirements.txt
├── register_map.md
├── .env
│
├── plant_server/
│   ├── __init__.py
│   ├── config.py
│   ├── registers.py
│   ├── physics.py
│   ├── modbus_server.py
│   └── run.py
│
└── legit_client/
    ├── __init__.py
    ├── config.py
    ├── operator.py
    └── run.py
```

### File-by-file responsibilities

**`plant_server/config.py`** — Modbus server port, tick interval, danger-condition thresholds (e.g., how long pump-on + valve-closed is tolerated before it counts as a danger state).

**`plant_server/registers.py`** — The register map from `register_map.md`, expressed as named constants (e.g., a clearly labeled constant for each of the five register addresses from the Implementation Plan Section 6), so nothing in the rest of the codebase uses a raw number like `0` or `1` without a name attached.

**`plant_server/physics.py`** — Contains a `TankState` structure holding `water_level`, `pump_state`, `valve_state`, and a method `tick()`, responsible for applying one time-step of physics: adjusting the water level based on current pump/valve state, and checking whether the danger condition is currently true. This file has zero Modbus knowledge — it's pure tank behavior, which makes it easy to test on its own.

**`plant_server/modbus_server.py`** — Sets up the actual Modbus TCP server using the register addresses from `registers.py`, and wires it to a `TankState` instance from `physics.py`. Responsible for, on each tick: reading whatever's currently in the command holding registers, applying them to the `TankState`, calling `tick()`, and writing the resulting values back into the input registers.

**`plant_server/run.py`** — The entry point — starts the Modbus server defined above and keeps it running.

**`legit_client/config.py`** — Plant host/port, Backend URL (needed for command reporting), and timing values for how long the operator pauses between actions.

**`legit_client/operator.py`** — Contains the operator loop behavior: a sequence such as turn pump on, wait, turn pump off, open valve, wait, close valve, repeat — with a function like `run_operator_cycle()` responsible for executing one full cycle, sending each command both to the Plant (via Modbus) and to the Backend's `/commands/report` (with `source_id = "legit_operator"`).

**`legit_client/run.py`** — The entry point — runs `operator.py`'s cycle on a loop indefinitely.

---

## 5. Attacks — Directory Structure

```
attacks/
├── requirements.txt
├── .env
│
├── common/
│   ├── __init__.py
│   ├── config.py
│   └── client_helper.py
│
├── injection/
│   ├── attack.py
│   └── run.py
│
├── wrong_moment/
│   ├── attack.py
│   └── run.py
│
├── replay/
│   ├── attack.py
│   └── run.py
│
├── slow_drift/
│   ├── attack.py
│   └── run.py
│
└── maintenance_scenario/
    ├── scenario.py
    └── run.py
```

### File-by-file responsibilities

**`common/config.py`** — Shared Plant host/port and Backend URL, so every attack script and the maintenance scenario reads the same values instead of each hardcoding its own.

**`common/client_helper.py`** — Shared helpers used by every script in this folder, so the actual attack logic files stay focused on what makes each attack distinct rather than repeating connection boilerplate. Responsible for: `connect_to_plant()` (opens a Modbus connection), `report_command(command_type, value, source_id)` (sends the command both to the Plant and to the Backend's `/commands/report`, matching the self-reporting design decision at the top of this document), and `read_plant_registers()` (used by scripts, like Replay, that need to observe the Plant's current state before acting).

**`injection/attack.py`** — Contains `run_injection()`, responsible for sending a single unsolicited command directly, with `source_id = "attack_injection"`.

**`wrong_moment/attack.py`** — Contains `run_wrong_moment()`, responsible for reading the Plant's current state via `read_plant_registers()`, waiting until the water level is high (near the danger threshold) **and** the valve is closed, then sending the "pump on" command — with `source_id = "attack_wrong_moment"`. The water-level condition matters: pump on with valve closed at low/mid tank level is just normal filling, not an attack. This is the pressure-buildup scenario named directly in the track brief — a pump switched on against a closed valve, but only dangerous once the tank has nowhere left to hold the incoming water.

**`replay/attack.py`** — Contains two responsibilities, kept in the same file since they're two halves of one attack: `capture_snapshot()` (records a safe moment's register values) and `run_replay(snapshot)` (repeatedly re-sends that captured snapshot's readings later, while separately opening the valve so the real tank is actively draining underneath the frozen reading — the "control room stays calm while the tank empties" scenario named in the track brief). Note from the Implementation Plan: this one writes directly to input registers to simulate an intercepted feed, which is different from the other three attacks that only write to command/holding registers — worth a comment in the file itself explaining why, so it doesn't look like a mistake later.

**`slow_drift/attack.py`** — Contains `run_slow_drift()`, responsible for issuing many small, incremental commands over time with pauses between them, with `source_id = "attack_slow_drift"`.

**`maintenance_scenario/scenario.py`** — Contains `run_maintenance()`, responsible for the defined legitimate-maintenance behavior from the Implementation Plan Section 9 (valve opened/closed repeatedly with pump deliberately off), with `source_id = "maintenance_technician"` — this is what proves the Detector doesn't false-alarm on normal work.

**Each `run.py`** — A thin entry point per folder, so any script can be started independently from the command line, matching the incremental build order in Section 6 below.

---

## 6. Incremental Build Order

This ties the three components together into a sequence where every step produces something runnable and testable before moving to the next — nobody should be writing Layer 4 of the Detector before Layer 2 has been proven against a real attack, for example.

**Phase 1 — Skeletons respond (builds on the Groundwork doc's Step 10 check).**
Plant server responds to reads with fixed placeholder values. Backend `/plant/live` successfully returns whatever the Plant gives it. Dashboard shows it. Nothing dynamic yet.

**Phase 2 — Real tank physics.**
`physics.py`'s `tick()` becomes real. Plant server starts actually changing values over time based on pump/valve state. Backend's poller (`services/poller.py`) starts writing real `Reading` rows. Dashboard's live view now shows a genuinely moving tank level.

**Phase 3 — Legit Client + command reporting.**
`legit_client` runs its cycle, sending real commands to the Plant and reporting them to `/commands/report`. `commands` table starts filling with real, labeled, non-attack data. This is the first point where `Command` rows exist at all — confirm they show up correctly in `/history/commands` before moving on.

**Phase 4 — Detector Layers 1–2, tested against the first attack.**
Build `layer1_sanity.py` and `layer2_state_machine.py`, wire them into `engine.py`'s `evaluate_command()`. Build the **Injection** attack first (it's the simplest) and confirm Layer 1 reacts to it, then build **Wrong Moment** and confirm Layer 2 catches it specifically — this is the core result of the whole project, so don't move on until this is solid and demonstrable.

**Phase 5 — Detector Layers 3–4, tested against Replay and Slow Drift.**
Build `layer3_replay.py` and `layer4_drift.py`, wire them into `engine.py`'s `evaluate_reading()`, called from the poller. Build the **Replay** and **Slow Drift** attacks and confirm each is caught by its corresponding layer.

**Phase 6 — Maintenance scenario and false-positive testing.**
Build `maintenance_scenario/scenario.py`. Run it alongside the Legit Client for an extended stretch and confirm no Warning/Critical alerts appear — this is the evidence pass from the Implementation Plan Section 9.

**Phase 7 — Alerts endpoints and Dashboard alert view.**
Build `routes/alerts.py` and the Dashboard's Alerts view, wiring up severity color-coding and the plain-language messages. By this point every alert type already exists in the database from Phases 4–6, so this phase is purely about surfacing what's already being caught.

**Phase 8 — Polish and demo scenario endpoint.**
Only once Phases 1–7 are solid: optionally build `routes/simulate.py` for demo convenience, and do a full combined run-through matching the Testing & Validation Plan from the Implementation Plan document.
