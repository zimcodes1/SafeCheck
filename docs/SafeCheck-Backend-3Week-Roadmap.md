# SafeCheck — Backend 3-Week Completion Roadmap

This is a solo-backend build plan. Every day builds directly on the day before — nothing here should be started out of order, because later days assume earlier files already exist and work. Each entry lists what you're building, which files it touches, what it depends on, and a "done when" check so you know when to move on. Small snippets are included only where they clarify a shape (a schema, a model) — the actual logic is still yours to write.

---

## WEEK 1 — Foundation, Data, and the Live Pipeline

### Day 1 — Project skeleton, config, and a health check
**Builds on:** the scaffold folders already existing (empty) from the groundwork doc.
**Files:** `app/main.py`, `app/config.py`

Get the FastAPI app importable and runnable, reading all its configurable values (ports, database path, Plant host/port, polling interval) from environment variables via `config.py`, with sensible defaults so it runs even without a `.env` present yet.

```python
# app/config.py — shape only
class Settings(BaseSettings):
    backend_port: int = 8000
    plant_host: str = "127.0.0.1"
    plant_port: int = 5020
    db_path: str = "safecheck.db"
    poll_interval_seconds: float = 1.0
```

**Done when:** running the app and visiting the root URL returns something — even a placeholder JSON message — proving the environment and dependencies are correctly installed.

---

### Day 2 — Database connection and table creation
**Builds on:** Day 1's `config.py` for the db path.
**Files:** `app/database.py`

Set up the SQLite engine/session handling and an `init_db()` function that creates all tables from the model definitions (which don't exist yet — that's fine, this function just needs to be ready to call them). Wire `init_db()` into `main.py`'s startup so the `.db` file gets created automatically the first time the app runs.

**Done when:** running the app produces a `safecheck.db` file on disk, even though it has no tables with real data yet.

---

### Day 3 — Data models: `Reading`, `Command`, `Alert`
**Builds on:** Day 2's database setup — these models are what `init_db()` will actually create tables from.
**Files:** `app/models/reading.py`, `app/models/command.py`, `app/models/alert.py`

Define the three ORM models exactly as specified in the Data Models & Endpoints Guide (Section 2). Keep `Alert.related_command_id` as a nullable foreign key to `Command.id`.

```python
# app/models/reading.py — shape only
class Reading(Base):
    __tablename__ = "readings"
    id: int
    timestamp: datetime
    water_level: float
    pump_state: bool
    valve_state: bool
    source: str
```

**Done when:** restarting the app creates all three tables in `safecheck.db`, confirmed by opening the file with any SQLite viewer and seeing empty `readings`, `commands`, and `alerts` tables.

---

### Day 4 — Pydantic schemas
**Builds on:** Day 3's models — schemas mirror them but are the API-facing shapes, not the database shapes.
**Files:** `app/schemas/reading.py`, `app/schemas/command.py`, `app/schemas/alert.py`, `app/schemas/plant.py`

Define `ReadingOut`, `CommandIn`, `CommandOut`, `AlertOut`, `AlertDetail`, and `PlantLiveResponse` per the field lists in the Data Models & Endpoints Guide (Sections 2–3).

```python
# app/schemas/command.py — shape only
class CommandIn(BaseModel):
    command_type: Literal["pump", "valve"]
    value: bool
    source_id: str
```

**Done when:** every schema file imports cleanly with no errors — there's nothing to "run" yet, this is purely defining shapes other days will use.

---

### Day 5 — Modbus client service
**Builds on:** Day 1's `config.py` for the Plant's host/port.
**Files:** `app/services/modbus_client.py`

Build `read_plant_state()`, responsible for opening a Modbus connection to the Plant and reading the three input registers (water level, pump status, valve status), returning them as plain Python values.

**Note:** this day depends on the Plant server existing and responding — if you're building backend solo while plant/attacks work happens in parallel, make sure at minimum a placeholder Plant server (even one just returning fixed dummy values) is running so you have something to connect to and test against.

**Done when:** calling `read_plant_state()` manually (e.g., from a quick throwaway script or the Python shell) returns real values from whatever Plant server is currently running, without erroring.

---

### Day 6 — `GET /plant/live` endpoint
**Builds on:** Day 4's `PlantLiveResponse` schema and Day 5's `read_plant_state()`.
**Files:** `app/routes/plant.py`, wire into `main.py`

The first real endpoint. Calls `read_plant_state()` and shapes the result into `PlantLiveResponse`.

**Done when:** hitting `GET /plant/live` in a browser or API client returns real, current Plant values as JSON, and the values change between requests if the Plant's state is changing.

---

### Day 7 — Background poller writing `Reading` rows
**Builds on:** Day 5's Modbus client, Day 3's `Reading` model, Day 2's database session.
**Files:** `app/services/poller.py`, wire into `main.py` startup

Build `poll_once()`, called on a repeating timer at the interval from `config.py`. Each call reads the Plant's state and saves it as a new `Reading` row. This is what makes the `readings` table fill up continuously without any endpoint being manually called.

**Done when:** leaving the app running for a minute and then inspecting `safecheck.db` shows roughly one new `Reading` row per second, with values matching what `/plant/live` was returning at that time.

**Week 1 checkpoint:** by end of Day 7, you have a fully working read pipeline — Plant → Backend → Database → API — even though nothing about commands or detection exists yet. This is a legitimate, demoable milestone on its own.

---

## WEEK 2 — Commands and the Detector

### Day 8 — `POST /commands/report` (no detection yet)
**Builds on:** Day 4's `CommandIn`/`CommandOut` schemas, Day 3's `Command` model.
**Files:** `app/routes/commands.py`

Accepts a `CommandIn` payload, saves it as a new `Command` row with `flagged = false` for now (detection logic comes later this week), and returns the created `CommandOut`.

**Done when:** you can manually POST a fake command (e.g., `{"command_type": "pump", "value": true, "source_id": "test"}`) and see it appear as a new row in the `commands` table.

---

### Day 9 — `GET /history/readings` and `GET /history/commands`
**Builds on:** Day 7's populated `readings` table and Day 8's populated `commands` table.
**Files:** `app/routes/history.py`

Two endpoints, both supporting optional `start`/`end`/`limit` query parameters, returning lists of `ReadingOut` / `CommandOut` respectively, most recent data included.

**Done when:** both endpoints return real rows matching what's actually in the database, and the `limit` parameter genuinely caps the result count.

---

### Day 10 — Detector Layer 1: sanity check
**Builds on:** Day 8's `Command` model — this is the first thing that will inspect a command before it's fully trusted.
**Files:** `app/detector/layer1_sanity.py`

Build `check_sanity(command)`, responsible for confirming the command type and value are within expected bounds and the source isn't empty/malformed. Returns a simple pass/fail plus a reason string if it fails.

**Done when:** calling it directly with a deliberately malformed input (e.g., an empty `source_id`) correctly returns a failure, and a normal input correctly passes.

---

### Day 11 — Detector Layer 2: state-machine validity
**Builds on:** Day 10's pattern for how a layer function is shaped, and Day 6's live Plant state.
**Files:** `app/detector/layer2_state_machine.py`

This is the most important file in the whole backend. Build `check_state_validity(command, current_plant_state)`, responsible for looking up whether the incoming command is safe given the Plant's state at the moment it arrives. Keep the actual safe/unsafe rule table in this same file as a clearly named structure, so it's easy to find and tune later without hunting through other files. Note the rule needs two conditions together, not one: pump-on-with-valve-closed is normal filling behavior at low/mid water level — it's only unsafe once the water level is also near the danger threshold, since that's the point where the pump has nowhere left to push water. A rule keyed on valve state alone would flag ordinary operation as an attack.

```python
# app/detector/layer2_state_machine.py — shape only
UNSAFE_COMBINATIONS = [
    # (command_type, value, condition_on_current_state) -> description
    # e.g. pump=on, valve currently closed, AND water_level >= danger_threshold
]

def check_state_validity(command, current_state):
    ...  # your logic here
```

**Done when:** manually testing with a plant state you construct yourself (valve closed, water level near the danger threshold) plus a "pump on" command correctly flags as unsafe — a pump switched on against a closed valve with nowhere for the water to go, the exact scenario named in the track brief — and the same command with the valve open, or with the water level low, correctly passes in both cases.

---

### Day 12 — Detector engine orchestrator, wired into `/commands/report`
**Builds on:** Days 10–11's two layers, Day 8's endpoint, Day 3's `Alert` model.
**Files:** `app/detector/engine.py`, update `app/routes/commands.py`

Build `evaluate_command(command)`, responsible for running Layers 1 and 2 in order, creating an `Alert` row (with appropriate severity and a plain-language `message`) if either layer flags something, and setting `flagged = true` on the related `Command` row. Update the `/commands/report` endpoint to call this synchronously and include the resulting `alert` (if any) in its response.

**Done when:** POSTing a deliberately unsafe test command produces both a new `Alert` row in the database and a non-null `alert` field in the endpoint's response — and POSTing a safe command produces neither.

**This is your first fully working end-to-end detection.** If you have any way to run even one real attack script against this at this point (coordinate with whoever owns Plant/Attacks), do it now — this is the core deliverable of the whole project, worth confirming solidly before moving further.

---

### Day 13 — Detector Layer 3: replay detection
**Builds on:** Day 7's `readings` history — this layer needs recent rows to compare against, unlike Layers 1–2 which only look at one command in isolation.
**Files:** `app/detector/layer3_replay.py`

Build `check_for_replay(new_reading, recent_readings)`, responsible for comparing the newest reading against a short window of recent ones, flagging when a value looks suspiciously unchanged despite the Plant's state suggesting it should be moving.

**Done when:** manually constructing a fake sequence of identical readings alongside an "active" pump state correctly triggers a flag, and a normal changing sequence doesn't.

---

### Day 14 — Detector Layer 4: drift detection, wired into the poller
**Builds on:** Day 13's pattern, Day 7's poller.
**Files:** `app/detector/layer4_drift.py`, update `app/detector/engine.py`, update `app/services/poller.py`

Build `check_for_drift(recent_readings, window)`, responsible for tracking cumulative change over the configured rolling window. Add `evaluate_reading(reading)` to `engine.py`, running Layers 3–4 together. Wire `poller.py`'s `poll_once()` to call `evaluate_reading()` after saving each new `Reading` row.

**Done when:** the poller runs continuously and, when fed a slowly drifting sequence of test values (simulate this manually if attack scripts aren't ready yet), correctly raises an alert once the cumulative change crosses the threshold — not on any single step.

**Week 2 checkpoint:** by end of Day 14, all four detector layers exist and are wired into the live pipeline. Every category of attack from the project brief now has a corresponding, working detection path.

---

## WEEK 3 — Alerts API, Robustness, and Demo Readiness

### Day 15 — `GET /alerts` and `GET /alerts/{id}`
**Builds on:** Day 12 and Day 14's alert-generating logic — there should already be real `Alert` rows to query by now.
**Files:** `app/routes/alerts.py`

`GET /alerts` returns a list of `AlertOut`, most recent first, supporting an optional `severity` filter and a `limit`. `GET /alerts/{id}` returns the full `AlertDetail`, including the related `CommandOut` when `related_command_id` isn't null.

**Done when:** both endpoints return real, correctly shaped data matching what's actually in the `alerts` table, and the severity filter genuinely narrows results.

---

### Day 16 — Alert message quality pass
**Builds on:** everything from Days 12 and 14 that generates `message` text.
**Files:** revisit `app/detector/engine.py`, `layer2_state_machine.py`, `layer3_replay.py`, `layer4_drift.py`

Go back through every place an `Alert` gets created and make sure the `message` field reads as a genuinely plain sentence a non-technical engineer could understand — this was flagged as a specific judging criterion, so it's worth a dedicated pass rather than leaving whatever text you wrote quickly on Day 12.

**Done when:** you can read every distinct alert message type out loud and it makes sense without any security jargon.

---

### Day 17 — `confidence` handling for ambiguous cases
**Builds on:** Day 12's engine, now revisited to make sure "unsure" is a real possible outcome, not just pass/fail.
**Files:** `app/detector/engine.py`

Make sure at least one path in your logic can produce `confidence = "needs_review"` rather than forcing every evaluation into a hard certain pass/fail — e.g., a command from a source you have no prior history for, that isn't clearly unsafe by the state-machine rules either.

**Done when:** you can construct a test case that deliberately produces a `needs_review` alert, distinct from your normal `certain` ones.

---

### Day 18 — Input validation and error handling pass
**Builds on:** every endpoint built so far.
**Files:** all of `app/routes/*.py`

Go through each endpoint and confirm it handles bad input gracefully — a malformed `CommandIn`, an `/alerts/{id}` for an ID that doesn't exist, a `/history/readings` request with `start` after `end`. FastAPI's schema validation handles a lot of this automatically via Pydantic, but check the cases it doesn't (like the nonexistent-ID lookup, which should return a proper 404, not a crash).

**Done when:** deliberately sending bad requests to every endpoint returns sensible HTTP error responses, not unhandled exceptions.

---

### Day 19 — `POST /simulate/scenario` (optional, only if time allows)
**Builds on:** everything — this is purely a demo convenience, not a core requirement.
**Files:** `app/routes/simulate.py`

Accepts a `scenario_name` and kicks off the corresponding attack/maintenance script as a background process. This file should contain no scenario logic of its own — it only triggers scripts that already exist in `attacks/`.

**Done when:** triggering this endpoint visibly starts the named scenario, confirmed by watching new `Command`/`Alert` rows appear shortly after.

**Skip this day entirely if Week 3 is running tight** — manually starting attack scripts for the demo is a perfectly fine fallback and this endpoint adds convenience, not correctness.

---

### Day 20 — Logging and internal review
**Builds on:** the whole app.
**Files:** light touches across `services/`, `detector/`

Add basic logging (even simple print statements are fine under time pressure) at key points — poller ticks, command evaluations, alert creation — so that if something goes wrong live during the demo, you have visible output to diagnose it from immediately rather than guessing.

**Done when:** running the app and watching its console output gives you a clear, readable narrative of what's happening as commands and readings flow through.

---

### Day 21 — Full integration test and buffer day
**Builds on:** everything.

Run the complete system end to end: Plant, Legit Client, Backend, and each attack script plus the maintenance scenario, back to back, exactly as described in the Testing & Validation Plan from the Implementation Plan document. Confirm every attack produces the expected alert, the maintenance scenario produces none, and nothing crashes across a sustained run.

**Done when:** you can run the whole system, unattended, for at least 10–15 minutes covering all four attacks plus maintenance, and get consistent, explainable results — this is your actual submission evidence, not just a "looks done" feeling.

Treat any slack time left in this day as buffer against whichever earlier day ran over — with a solo backend build, at least one day almost always does, and it's better to have planned for that than to discover it on Day 21 itself.
