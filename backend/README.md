# SafeCheck Backend & Intrusion Detection System

Team: SafeCheck_TrackE  
Project: ICSC (International Cybersecurity Conference) Hackathon 2026

This repository contains the backend and intrusion detection engine for the SafeCheck system: a context-aware security monitoring layer built to protect a simulated industrial water plant (tank, pump, valve) communicating over Modbus TCP. The backend continuously observes physical telemetry, maintains an audit trail in SQLite, inspects operator/attacker commands against physical state constraints, and exposes an advisory REST API for human operators and control dashboards.

---

## 1. What system is being monitored?

```text
┌─────────────┐        ┌──────────────┐        ┌─────────────┐
│  Attackers  │──────▶│              │        │             │
│ (4 vectors) │        │  THE PLANT   │◀──────│ Legit Client │
└─────────────┘        │ (Modbus TCP  │        │  (Operator)  │
                       │  port 5020)  │        └─────────────┘
                       └──────┬───────┘
                              │ polled every 1.0s via Modbus
                              ▼
                       ┌──────────────┐
                       │   BACKEND    │──────▶ SQLite (safecheck.db)
                       │  (FastAPI)   │        - readings
                       │ + DETECTOR   │        - commands
                       │   4 Layers   │        - alerts
                       └──────┬───────┘
                              │ polled / queried
                              ▼
                       ┌──────────────┐
                       │  DASHBOARD   │
                       │ (React + TS) │
                       └──────────────┘
```

In industrial control systems (ICS), standard communication protocols such as Modbus TCP lack built-in authentication, encryption, or integrity verification. An attacker who gains network access can craft technically valid Modbus packets that command field equipment into dangerous physical states (e.g., pressure buildup or tank overflow) or forge telemetry readings to blind human operators.

SafeCheck addresses this vulnerability as an **advisory detection layer**:

- It does **not** autonomously disrupt or block the process (preventing catastrophic false-positive trips in critical infrastructure).
- It continuously correlates commands and sensor telemetry against **physical laws and operational state machines**.
- It provides human-readable explanations, severity levels (`info`, `warning`, `critical`), and explicit confidence classifications (`certain` vs `needs_review`) on an engineer-facing dashboard.

---

## 2. Project structure

```text
backend/
├── README.md                          # this document
├── API.md                             # comprehensive REST API endpoint reference
├── pyproject.toml                     # dependencies and package configuration
├── requirements.txt                   # dependency fallback
├── safecheck.db                       # SQLite history database (auto-generated)
├── day21_integration_results.json    # automated full-system integration report
├── day21_soak_report.json             # sustained soak testing metrics
├── logs/                              # session-aware structured log files
├── app/
│   ├── __init__.py
│   ├── main.py                        # FastAPI application entry point & router setup
│   ├── config.py                      # environment-driven runtime configuration
│   ├── database.py                    # SQLModel database engine & session provider
│   ├── logger.py                      # structured session logging & request middleware
│   │
│   ├── models/                        # SQLModel ORM database table schemas
│   │   ├── __init__.py
│   │   ├── reading.py                 # `readings` table definition
│   │   ├── command.py                 # `commands` table definition
│   │   └── alert.py                   # `alerts` table definition
│   │
│   ├── schemas/                       # Pydantic request & response models
│   │   ├── __init__.py
│   │   ├── plant.py                   # PlantLiveResponse schema
│   │   ├── reading.py                 # ReadingOut schema
│   │   ├── command.py                 # CommandIn, CommandOut schemas
│   │   └── alert.py                   # AlertOut, AlertDetail schemas
│   │
│   ├── routes/                        # FastAPI route controllers
│   │   ├── __init__.py
│   │   ├── plant.py                   # GET /plant/live controller
│   │   ├── commands.py                # POST /commands/report controller
│   │   ├── history.py                 # GET /history/readings & /commands
│   │   ├── alerts.py                  # GET /alerts & /alerts/{id}
│   │   └── simulate.py                # POST /simulate/scenario controller
│   │
│   ├── services/                      # Background asynchronous services
│   │   ├── __init__.py
│   │   ├── modbus_client.py           # Modbus TCP client reader for input registers
│   │   ├── poller.py                  # 1-second telemetry poller & detector trigger
│   │   └── simulator.py               # programmatic scenario runner for Day 19
│   │
│   └── detector/                      # The 4-Layer Detection Engine
│       ├── __init__.py
│       ├── layer1_sanity.py           # Layer 1: structural & bounds verification
│       ├── layer2_state_machine.py    # Layer 2: physical state-machine safety lookup
│       ├── layer3_replay.py           # Layer 3: sensor freeze & replay detection
│       ├── layer4_drift.py            # Layer 4: slow drift & cumulative rate analysis
│       └── engine.py                  # detector orchestrator & alert synthesizer
│
├── scripts/
│   ├── simulate_all.py                # runs all 8 attack & validation scenarios
│   └── run_day21_soak.py              # runs sustained unattended soak test
│
└── tests/
    ├── test_day17_confidence.py       # tests confidence handling for anomalies
    ├── test_day18_detectors.py        # unit tests across Layers 1–4
    └── test_day21_integration.py      # full end-to-end integration test suite
```

---

## 3. The 4-Layer Detection Architecture

The detector reasons about incoming commands and streamed telemetry in four distinct, specialized layers ordered from cheapest/most deterministic to most subtle:

```text
Incoming Commands ──▶ [ Layer 1: Sanity Check ]
                              │ Pass
                              ▼
                      [ Layer 2: State-Machine Validity ]
                              │ Evaluated against LIVE physical state
                              ▼
                      (Result: Saved to `commands`, Alert generated if flagged)

Continuous Readings ─▶ [ Layer 3: Replay Detection ]
                              │ Stuck readings check
                              ▼
                      [ Layer 4: Drift & Leak Detection ]
                              │ Cumulative rate check
                              ▼
                      (Result: Saved to `alerts` if anomaly detected)
```

### Layer 1 — Sanity Check (`layer1_sanity.py`)

- **Focus**: Command formatting, type enforcement, boundary values, and non-empty `source_id`.
- **Trips on**: Malformed packets, out-of-range integer values, or missing identity tags.
- **Alert Level**: `SeverityEnum.WARNING`, `ConfidenceEnum.CERTAIN`.

### Layer 2 — State-Machine Validity (`layer2_state_machine.py`)

- **Focus**: Evaluates whether an incoming command is safe given the plant's **true physical state** at the moment the command arrives.
- **Physics Rules**:
  - Unsafe to start or keep pump `ON` while valve is `CLOSED` and tank water level is near the capacity threshold ($\ge 95.0\%$).
  - Unsafe to `CLOSE` valve while pump is `RUNNING` and water level is already high ($\ge 95.0\%$).
- **Trips on**: Attack vector 3 (_Valid command, wrong moment_).
- **Alert Level**: `SeverityEnum.CRITICAL`, `ConfidenceEnum.CERTAIN`, command is marked `flagged = True`.

### Layer 3 — Replay & Stuck Sensor Detection (`layer3_replay.py`)

- **Focus**: Evaluates historical reading windows against actuator activity. If the pump has been actively running, the water level physically must change; water cannot remain bit-for-bit static.
- **Trips on**: Attack vector 2 (_Replay / Man-In-The-Middle sensor freezing_).
- **Alert Level**: `SeverityEnum.WARNING`, `ConfidenceEnum.NEEDS_REVIEW`.

### Layer 4 — Slow Cumulative Drift Detection (`layer4_drift.py`)

- **Focus**: Evaluates rolling rates of change over a sliding window ($\Delta\text{level} / \Delta t$). Catches gradual shifts where each individual 1-second step is too small to trip a threshold, but the cumulative trend is physically anomalous (e.g., water rising while pump is off, or pump running without expected level increase).
- **Trips on**: Attack vector 4 (_Slow drift attack / hidden leak_).
- **Alert Level**: `SeverityEnum.WARNING`, `ConfidenceEnum.NEEDS_REVIEW`.

---

## 4. Backend Module Details

### 4.1 Configuration (`app/config.py`)

Reads all runtime parameters from environment variables (or defaults):

- `BACKEND_PORT`: Port the FastAPI app listens on (default: `8000`).
- `PLANT_HOST`: Host address of the Modbus Plant server (default: `127.0.0.1`).
- `PLANT_PORT`: Modbus TCP port (default: `5020`).
- `DB_PATH`: Path to the SQLite database (default: `safecheck.db`).
- `POLL_INTERVAL_SECONDS`: Background poller frequency (default: `1.0` second).

### 4.2 Database & Data Models (`app/database.py`, `app/models/`)

All historical data is persisted using **SQLModel** into SQLite:

- `readings` table: `id`, `timestamp`, `water_level`, `pump_state`, `valve_state`, `source`.
- `commands` table: `id`, `timestamp`, `command_type`, `value`, `source_id`, `flagged`.
- `alerts` table: `id`, `timestamp`, `severity`, `rule_triggered`, `related_command_id` (foreign key $\to$ `commands.id`, nullable), `message`, `confidence`.

### 4.3 REST API Endpoints (`app/routes/`)

All endpoints are available at both root and under the `/api` prefix:

- `GET /plant/live`: Polls current plant state over Modbus (never cached).
- `POST /commands/report`: Self-reporting endpoint for clients/attackers. Runs Layers 1 & 2 synchronously against live physical state.
- `GET /history/readings`: Paginated telemetry history with `start` and `end` timestamps.
- `GET /history/commands`: Historical command log with flag indicators.
- `GET /alerts`: Reverse-chronological alert feed with severity filters (`info`, `warning`, `critical`).
- `GET /alerts/{id}`: Detailed alert inspection with related command data.
- `POST /simulate/scenario`: Triggers programmatic attack scenarios for demonstration.

_See [API.md](API.md) for the complete endpoint schema reference and JSON payloads._

### 4.4 Background Poller (`app/services/poller.py`)

Runs continuously on an asynchronous timer on startup:

1. Calls `read_plant_state()` to query input registers 0–2 from the Plant Modbus server.
2. Commits a new `Reading` row into `safecheck.db`.
3. Passes the latest reading alongside recent history into `evaluate_reading()` to execute Layers 3 & 4.

### 4.5 Logging System (`app/logger.py`)

Session-aware logger writing to both stdout and timestamped session files under `logs/`:

- Example file: `logs/session_20260903_074409.log`
- Format: `TIMESTAMP | LEVEL | LOGGER | MESSAGE`
- Includes custom HTTP request-logging middleware logging method, path, response status, and duration in milliseconds.

---

## 5. How to Set Up and Run

### Prerequisites

- Python 3.13+
- [UV](https://docs.astral.sh/uv/) package manager

### 1. Setup Environment

```bash
cd SafeCheck/backend
uv sync
```

### 2. Run the Backend API Server

```bash
cd SafeCheck/backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The server will automatically initialize `safecheck.db` and start the poller loop.

### 3. Run Automated Tests & Integration Verifications

To run unit and detector layer tests:

```bash
uv run python tests/test_day17_confidence.py
uv run python tests/test_day18_detectors.py
```

To run the full 8-scenario detector verification:

```bash
uv run python scripts/simulate_all.py
```

To run the **Day 21 Full Integration Test Suite** (end-to-end with Modbus Plant):

```bash
uv run python tests/test_day21_integration.py
```

To run an **Extended Soak Test** (e.g. 60 seconds or up to 15 minutes):

```bash
uv run python scripts/run_day21_soak.py --duration 60
```

---

## 6. Operational Notes for Demos

- **Live Plant Dependency**: When the Plant server is running on port 5020, `GET /plant/live` and `/commands/report` interact with live physical state. If the plant is temporarily stopped, the backend degrades gracefully by falling back to persisted telemetry.
- **Dual Path Compatibility**: Both `/plant/live` and `/api/plant/live` (and all other endpoints) resolve properly to support various frontend integration setups.
- **Zero False-Alarm Guarantee**: Normal operator cycles and maintenance procedures have been verified through Day 21 integration tests to produce **zero false-positive alerts**.

---

## 7. Why this matters for SafeCheck_TrackE

In critical industrial environments, traditional IT intrusion prevention systems (which automatically block network traffic) can inadvertently cause physical damage by cutting off emergency safety controls.

SafeCheck proves an alternative, safer paradigm:

1. **Advisory Monitoring**: SafeCheck surfaces actionable, plain-language insights directly to engineers without blindly dropping packets.
2. **Contextual Physics**: By analyzing the combination of actuator instructions and real-time physical telemetry, SafeCheck detects attacks that signature-based firewalls cannot see.
3. **Transparent Confidence**: Every alert provides certainty indicators (`certain` vs `needs_review`) so operators know immediately whether an anomaly is an unambiguous safety violation or an empirical sensor drift requiring review.

---

## 8. Quick Start Summary

```bash
# Terminal 1: Start Plant Server
cd SafeCheck/plant
uv run python run.py

# Terminal 2: Start Backend API
cd SafeCheck/backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 3: Run Full Integration Test Suite
cd SafeCheck/backend
uv run python tests/test_day21_integration.py
```

Check `logs/` for structured execution traces and `day21_integration_results.json` for verified test reports.
