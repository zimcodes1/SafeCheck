# SafeCheck — Detailed Implementation Plan

**Track E: Catching Unsafe Commands in Your Own Control System**

This document explains exactly how every part of SafeCheck works and how it should be built — the data it stores, the messages it sends between parts, the logic each piece runs, and how the team should split the work in git. No code is written here on purpose: every section explains the *logic* in plain language so whoever picks it up can translate it into code themselves, in whichever language detail they're comfortable with.

---

## 1. What SafeCheck Is, In One Paragraph

SafeCheck is a small simulated water plant (a tank, a pump, a valve) that runs on a real industrial protocol called Modbus. We deliberately attack our own plant four different ways — none of which involve "hacking" in the traditional sense, all of which involve sending commands that are technically valid — and we build a detector that watches everything happening in the plant and figures out, from *context*, when a valid-looking command is actually dangerous. An engineer-facing screen shows what SafeCheck caught, in plain sentences, and SafeCheck never takes action on its own — it only advises.

---

## 2. System Architecture — The Five Moving Parts

Picture five separate programs, each running at the same time, each doing one job, talking to each other over the network (even though on demo day they'll likely all live on one laptop).

```
┌─────────────┐        ┌──────────────┐        ┌─────────────┐
│  Attackers  │──────▶│              │        │             │
│ (4 scripts) │        │  THE PLANT   │◀──────│ Legit Client │
└─────────────┘        │ (Modbus TCP  │        │  (Operator)  │
                        │   server)    │        └─────────────┘
                        └──────┬───────┘
                               │ polled continuously
                               ▼
                        ┌──────────────┐
                        │   BACKEND    │──────▶ SQLite (history)
                        │  (FastAPI)   │
                        │ + DETECTOR   │
                        └──────┬───────┘
                               │ polled every ~1s
                               ▼
                        ┌──────────────┐
                        │  DASHBOARD   │
                        │ (React + TS) │
                        └──────────────┘
```

**Plain-language version of this diagram:** the Plant is the "thing being controlled" — it doesn't know or care who's talking to it, it just obeys valid commands, exactly like a real industrial system would. Several different programs talk to the Plant: one well-behaved (the Legit Client) and four badly-behaved on purpose (the Attackers). The Backend sits off to the side, constantly watching the Plant, writing everything it sees into a permanent record (SQLite), and running the Detector logic on that stream of activity. The Dashboard is simply a window into the Backend — it asks "what's going on?" once a second and displays the answer.

**Why this shape matters:** the Detector never talks to the Plant directly to "block" anything, and it can't — because in real life, a detection system bolted onto a decades-old industrial protocol has no power to stop a command from being obeyed either. This is intentional and matches the brief's rule that a human decides, not the system.

---

## 3. Dependencies

### Plant, Backend, Detector, Attack Scripts, Legit Client (all Python)
| Dependency | Purpose |
|---|---|
| `pymodbus` | Runs the Modbus TCP server (the Plant) and Modbus TCP clients (Legit Client, Attack scripts) |
| `fastapi` | Backend web framework — serves the API the Dashboard talks to |
| `uvicorn` | Runs the FastAPI app as an actual running server |
| `sqlite3` (built into Python) | Reads and writes the history database — no separate install needed |
| `apscheduler` *(optional)* | Runs the Plant's physics tick and the Detector's periodic checks on a clean schedule, instead of hand-rolled timing loops |
| `pydantic` *(comes with FastAPI)* | Defines the shape of data going in/out of the API so mistakes get caught early |

### Dashboard (React + TypeScript)
| Dependency | Purpose |
|---|---|
| `react` + `react-dom` | Core UI library |
| `typescript` | Type safety — catches shape mismatches between what the Backend sends and what the UI expects |
| `vite` | Fast local dev server and build tool — simpler setup than older tooling |
| `axios` *(or plain `fetch`)* | Makes the polling requests to the Backend every second |
| A charting-adjacent library *(optional, e.g. a simple progress-bar/gauge component you build yourselves)* | Tank fill visual — this genuinely doesn't need a heavy charting library, a styled div is enough |

### Dev/shared tooling
| Dependency | Purpose |
|---|---|
| `git` | Version control (see Section 4) |
| `.env` files per component | Keeps ports and file paths configurable without hardcoding, so anyone on the team can run it on their own machine |

---

## 4. Git Branching Strategy

Keep this simple — a 3-week hackathon doesn't need a heavyweight branching model, but it does need enough structure that 3 people aren't stepping on each other's files daily.

**`main`** — always the last known-working, demoable state. Nobody commits to `main` directly.

**`develop`** — integration branch. Everyone merges here first; this is what gets tested together before promoting to `main`.

**Feature branches**, one per person per component, named clearly:
- `feature/plant-simulator` — Person 1, the Plant + register map + Legit Client
- `feature/attack-scripts` — Person 2, the four attack scripts + maintenance scenario
- `feature/backend-api` — Person 3, FastAPI endpoints + SQLite models
- `feature/detector-layers` — Person 3 (or split with Person 2 once attacks exist to test against), the four detection layers
- `feature/dashboard-live` — Person 4, the live tank/pump/valve view
- `feature/dashboard-alerts` — Person 4, the alert history view
- `docs/write-up` — Person 5, limitations doc, offline-behavior answer, demo script

**Workflow:** branch off `develop`, work, open a pull request back into `develop`, at least one other person reviews before merging (even a 2-minute glance — catches register-map mismatches early, which is the most likely source of bugs given how many pieces share that one contract). Merge `develop` into `main` at the end of each week as a checkpoint, so you always have a working fallback if something breaks late.

**Why this matters for a non-technical-heavy team:** it means Person 1's work on the Plant can't accidentally break Person 4's Dashboard mid-week — they only collide when merging into `develop`, at a predictable moment, not constantly.

---

## 5. Data Models

All history lives in one SQLite file, `safecheck.db`. Three tables. Described here as field lists with plain-language meaning, not code — translate directly into whatever ORM or raw SQL you prefer.

### Table: `readings`
Every sensor reading the Plant produces, on every tick.

| Field | Type | Meaning |
|---|---|---|
| `id` | integer, auto-increment | Unique row identifier |
| `timestamp` | datetime | When this reading was taken |
| `water_level` | float (0–100) | Current tank fill percentage |
| `pump_state` | boolean | Is the pump currently on |
| `valve_state` | boolean | Is the valve currently open |
| `source` | text | Which register/poll cycle produced this (usually just "plant", but kept for consistency with `commands`) |

### Table: `commands`
Every instruction sent to the Plant, from anyone — legit or attacker.

| Field | Type | Meaning |
|---|---|---|
| `id` | integer, auto-increment | Unique row identifier |
| `timestamp` | datetime | When the command was sent |
| `command_type` | text | `"pump"` or `"valve"` |
| `value` | boolean | The instruction being sent (on/off, open/closed) |
| `source_id` | text | IP address or client label identifying who sent it — this is our "identity tagging" from the no-auth discussion, not a real login |
| `flagged` | boolean | Set by the Detector after the fact — did this command trigger an alert |

### Table: `alerts`
Every time the Detector decides something is worth flagging.

| Field | Type | Meaning |
|---|---|---|
| `id` | integer, auto-increment | Unique row identifier |
| `timestamp` | datetime | When the alert was raised |
| `severity` | text | `"info"`, `"warning"`, or `"critical"` |
| `rule_triggered` | text | Which detector layer caught this (`state_machine`, `replay`, `drift`, `sanity_check`) |
| `related_command_id` | integer, nullable | Foreign key back to `commands`, if the alert was caused by a specific command |
| `message` | text | The plain-language sentence shown to the engineer |
| `confidence` | text | `"certain"` or `"needs_review"` — supports the "what happens when unsure" requirement |

**Relationship in plain terms:** a `command` comes in, the Plant produces `readings` as a result of it (or independently, on its own clock), and the Detector — watching both streams — may produce an `alert` that points back to the specific `command` that triggered it. This chain (`command` → `reading` → `alert`) is exactly what you'll want to show judges when replaying an attack: "here's what was sent, here's what happened to the tank, here's what we caught."

---

## 6. Modbus Register Map

This is the shared contract every component depends on — get this agreed and written down before anyone starts coding, since a mismatch here breaks everything downstream silently.

**Holding registers (writable — commands go here):**
| Register | Meaning | Valid values |
|---|---|---|
| 0 | Pump command | 0 = off, 1 = on |
| 1 | Valve command | 0 = closed, 1 = open |

**Input registers (read-only — sensor data lives here):**
| Register | Meaning | Range |
|---|---|---|
| 0 | Water level reading | 0–100 |
| 1 | Pump actual status | 0 = off, 1 = on |
| 2 | Valve actual status | 0 = closed, 1 = open |

**Why "command" and "actual status" are separate:** a command is an *instruction* someone sent; the Plant's actual state is what really happened after applying it. Keeping these separate is what makes the Replay attack (Section 8) meaningful — an attacker can fake the "actual status" reading without ever sending a real command, and that gap is exactly what Layer 3 of the Detector is built to notice.

---

## 7. Backend API Endpoints (FastAPI)

The Dashboard only ever talks to these — it never touches Modbus or SQLite directly.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/plant/live` | Returns the Plant's current state right now (water level, pump, valve) — this is what the Dashboard polls every second for the live view |
| `GET` | `/history/readings` | Returns a time-range of past readings from SQLite — powers any "replay" charting |
| `GET` | `/history/commands` | Returns a time-range of past commands, including who sent them and whether they were flagged |
| `GET` | `/alerts` | Returns alerts, most recent first, with severity and message — powers the alert feed |
| `GET` | `/alerts/{id}` | Returns full detail on one alert, including its related command and the reasoning behind the flag |
| `POST` | `/simulate/scenario` *(optional, for demo convenience)* | Triggers a named scenario (e.g., "run maintenance demo" or "run drift attack demo") so you're not manually starting Python scripts live in front of judges |

**Why so few endpoints:** simplicity is a feature here, not a shortcut — fewer moving parts means fewer things that can silently break on demo day, and every endpoint maps directly onto something the Dashboard actually needs to show.

---

## 8. Component Logic, Explained in Plain Language

### 8.1 The Plant Simulator

Runs on a fixed clock — once every second, it does three things in order:

1. **Check for new commands.** Look at whatever's currently sitting in the pump/valve holding registers (these get overwritten whenever a client sends a new command).
2. **Apply physics.** If the pump is on, water level goes up by some fixed small amount. If the valve is open, water level goes down by some fixed small amount. If both are active, they mostly offset — this is realistic and also exactly what makes the "pump on + valve closed" danger condition meaningful, since it's the one combination where level only ever rises.
3. **Write the new readings.** Update the input registers with the new water level and the actual pump/valve status, and log a row into the `readings` table.

**The danger condition**, checked every tick regardless of what triggered it: pump on AND valve closed for too long (pressure buildup), or water level at 100 while valve is closed (overflow). This condition existing *inside the Plant itself* — not just in the Detector — matters, because it represents physical reality, independent of whether anyone's watching.

### 8.2 The Legit Operator Client

A simple loop that behaves the way a real operator would: turns the pump on for a while, turns it off, opens the valve to drain, closes it, repeats — with sensible pauses in between, never doing anything that creates the danger condition on purpose. This is what "normal" looks like in your logged data, and the Detector's baseline behavior gets learned/defined against this pattern.

### 8.3 The Attack Scripts

Each is its own small program, run independently of the Legit Client, connecting to the same Plant.

**Injection** — connects and simply writes to the pump/valve holding registers directly, the same way the Legit Client does, except with no "operator logic" behind it — it just fires a command. The point being demonstrated: nothing on the Plant's side distinguishes this from a legitimate instruction, because nothing checks who's allowed to send what.

**Replay** — first, it listens and records a real sequence of "everything normal" input register values (a snapshot of a safe moment). Later, while the true state has moved on, it repeatedly overwrites the input registers with that old, safe-looking snapshot — meaning anyone watching the readings (like a control room dashboard) sees "all fine" while the real tank is doing something else entirely. Pair this specifically with the valve being open and actively draining underneath the frozen snapshot — a static "everything's fine" reading next to a genuinely emptying tank is the exact scenario named in the track brief, and it's the detail that makes the demo land: the Dashboard says calm, the tank is visibly not. Note: this requires being able to write to input registers directly for the simulation's sake, even though in real Modbus those are meant to be read-only from the field device's perspective — worth a line in your write-up explaining you're simulating a man-in-the-middle intercepting real traffic, not exploiting Modbus itself.

**Valid command, wrong moment** — watches the current Plant state, waits for a moment where the valve is already closed, then deliberately sends "pump on" (or equivalently, waits for the pump to be on and sends "close valve") — a perfectly normal command in isolation, but combined with the current state, creates the pressure-buildup danger condition: a pump switched on against a closed valve, exactly as named in the track brief.

**Slow drift** — instead of one dramatic change, this script nudges a value (e.g., toggling the valve very briefly, repeatedly, or gradually increasing how long the pump stays on each cycle) by a tiny amount each time, waiting between nudges, so that no single step looks unusual — only the accumulated trend over several minutes reveals the problem.

Every attack script logs its own actions independently (what it sent and when) — this becomes your ground-truth answer key: you know exactly which rows in `commands` were attacks, because you generated them, which is exactly what lets you measure the Detector's accuracy honestly.

### 8.4 The Detector — Four Layers, Explained

The Detector runs continuously, watching new rows appear in `readings` and `commands`, and reasoning about them in four passes. Layers are cheapest-and-most-certain first, most-subtle last — a command can pass through all four checks.

**Layer 1 — Sanity check.** Is this command even well-formed? Is the value within the allowed range (0 or 1, nothing else)? Is it coming from a source we have any record of at all? This layer catches almost nothing an attacker with basic competence would trip, but it's cheap and expected, so it stays.

**Layer 2 — State-machine validity.** This is the core of the whole project. Maintain a simple lookup: given the Plant's state *right before* a command arrives, is the incoming command safe? For example: "pump on" is safe when the valve is open — but unsafe when the valve is closed, since the pump would then be pushing against a dead end with nowhere for the water to go. The same unsafe pairing applies in reverse: "close valve" while the pump is already running. This isn't machine learning; it's a table of (current state → incoming command → safe or unsafe) that you define by hand from the physics you already know. This single layer is what catches the "valid command, wrong moment" attack, because it's evaluating context, not the command in isolation.

**Layer 3 — Replay detection.** Compare each new reading against recent history. If the pump or valve has been actively on/open for multiple ticks in a row, the water level *should* be visibly changing — water physically cannot stay bit-for-bit identical while the pump runs. If a reading is suspiciously identical to one from several ticks ago, despite the state suggesting it should have changed, flag it as a possible replay. This is a comparison against recent rows in `readings`, not a model — just "does this number make physical sense given what's supposedly been happening."

**Layer 4 — Drift detection.** Track a rolling sum of how much a value has changed over a window of time (e.g., the last 5 minutes), rather than just the single latest change. If the total accumulated change over that window crosses a threshold — even though every individual step was small — flag it. This is the layer that catches the Slow Drift attack, because it's the only one looking at a *trend* instead of a single moment.

**Handling uncertainty:** any command or reading that doesn't clearly pass or clearly fail these checks (e.g., a pattern that resembles maintenance but isn't in the defined maintenance scenario) should produce an alert with `confidence = "needs_review"` rather than being silently allowed or silently blocked. This is a direct answer to the brief's requirement, and it should be visibly different in the Dashboard (e.g., a distinct color) from a confident detection.

### 8.5 Alert Lifecycle

1. Detector layer flags something → a row is written to `alerts`, linked back to the relevant `command` (if there is one).
2. The `commands` row gets `flagged = true` so the history view can show it inline.
3. The Backend's `/alerts` endpoint immediately reflects the new row — no separate "push" mechanism needed, since the Dashboard is already polling.
4. The Dashboard displays it in the alert feed, color-coded by severity, in plain language — never as a raw score.

### 8.6 The Dashboard

**Live view:** polls `/plant/live` once per second, renders the tank fill as a simple bar or gauge, and two indicator lights for pump/valve. Deliberately minimal — the goal is that a judge understands the current state of the plant in under two seconds of looking at the screen.

**Alerts view:** polls `/alerts` (or fetches on-demand when the tab is opened), shows a reverse-chronological feed, color-coded by severity (e.g., grey for info, amber for warning, red for critical), each entry showing the plain-language message and a timestamp. Clicking an alert can expand to show the related command/reading detail, using `/alerts/{id}`.

---

## 9. Testing & Validation Plan

- **Attack pass:** run each of the four attack scripts individually against a freshly running Plant, confirm the Detector raises the expected alert type for each, with the expected severity.
- **False-positive pass:** run the Legit Client and the defined maintenance scenario, back to back, for a stretch of several minutes, and confirm the Detector stays at "info" or silent throughout — this is the evidence for the brief's "prove a busy/normal day doesn't trigger false alarms" requirement.
- **Combined pass:** run legitimate traffic and one attack simultaneously (representing "the plant is being used normally while also under attack") to make sure the Detector doesn't get confused or miss the attack signal amid normal noise.
- **Reproducibility check:** delete the database, re-run every attack script from a clean start, and confirm you get materially the same detection results — this backs up your claim that the dataset/results are reproducible from the saved code, which the brief explicitly asks for.

Document the results of all four passes with actual numbers (how many attacks caught, how many false positives, if any) — this becomes your "explain your results honestly" section, which the brief calls out as a scored criterion, not an aside.

---

## 10. Demo Day Setup

Run all five components on one laptop, each on its own local port, no internet dependency. Suggested run order: start the Plant first, then the Legit Client, then the Backend, then the Dashboard — attack scripts run last, live, in front of judges, triggered manually or via the optional `/simulate/scenario` endpoint if you built it for convenience.

**Suggested demo narrative** (hand this to Person 5 to refine):
1. Show the Dashboard with the Plant running normally — narrate what "normal" looks like.
2. Run the maintenance scenario — show that the Detector correctly stays quiet.
3. Trigger the "valid command, wrong moment" attack live — show the alert appear in real time, in plain language.
4. Trigger the Replay attack — show the Dashboard still reporting "fine" while the alert feed simultaneously shows something's wrong, making the point visually that a human watching only the live numbers would miss it, but SafeCheck catches it separately.
5. Close with the honest limitations slide — what SafeCheck doesn't catch, and what you'd build next with more time.

---

## 11. Task-to-Branch Summary

| Person | Branch(es) | Deliverable |
|---|---|---|
| 1 | `feature/plant-simulator` | Plant, register map, Legit Client |
| 2 | `feature/attack-scripts` | Four attack scripts, maintenance scenario, ground-truth logging |
| 3 | `feature/backend-api`, `feature/detector-layers` | FastAPI endpoints, SQLite models, all four detector layers |
| 4 | `feature/dashboard-live`, `feature/dashboard-alerts` | React live view and alerts view |
| 5 | `docs/write-up` | Limitations doc, offline-behavior answer, demo script, alert-message wording review |
