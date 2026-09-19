# SafeCheck - Industrial Intrusion Detection System

A comprehensive cyber security monitoring system for industrial control systems (ICS) that protects a simulated water plant from cyber attacks using a 4-layer intrusion detection engine.

## Project Overview

SafeCheck is an advisory security monitoring layer that:

- Continuously monitors physical telemetry via Modbus TCP
- Correlates commands and sensor data against physical laws
- Detects attacks across 4 specialized detection layers
- Provides human-readable alerts with confidence levels
- Operates without autonomous disruption to prevent false-positive trips

## Architecture

```
Attackers/Legit Client → Water Plant (Modbus TCP)
                              ↓ passive packet capture
                       Backend (FastAPI + Detector) → Dashboard (React)
```

## Components

### Backend (`/backend`)

- **FastAPI** server with comprehensive REST API
- **4-Layer Detection Engine**:
  - Layer 1: Sanity checks (format validation)
  - Layer 2: State-machine validation (physics rules)
  - Layer 3: Replay detection (sensor freeze)
  - Layer 4: Drift detection (cumulative anomalies)
- **SQLite** database for readings, commands, alerts
- **Passive Modbus TCP packet sensor** that parses live write requests, including malformed frames
- **Background telemetry poller** with holding-register-diff fallback if packet capture is unavailable
- **Simulation scenarios** for testing

### Plant Simulator (`/plant`)

- **Modbus TCP** server simulating water tank, pump, valve
- Provides physical telemetry for detection testing
- Configurable attack scenarios for validation

### Dashboard (`/dashboard`)

- **React + TypeScript** with Vite
- Real-time plant monitoring and alerts
- Historical data visualization
- Attack simulation interface
- Dark/light theme support

## Quick Start

### Prerequisites

- Python 3.13+ with UV package manager
- Node.js 18+ with Yarn
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd SafeCheck

# Install backend dependencies
cd backend
uv sync

# Install dashboard dependencies
cd ../dashboard
yarn install
```

### Running the System

**Terminal 1 - Start Plant Simulator:**

```bash
cd plant
uv run python run.py
```

**Terminal 2 - Start Backend API:**

```bash
cd backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The passive sensor requires packet-capture privileges: on Linux run the backend with `sudo` (or grant `CAP_NET_RAW`) and use `SNIFF_INTERFACE=lo`; macOS uses `lo0`, while Windows requires Npcap and an Administrator shell. If unavailable, SafeCheck automatically uses the polling fallback.

**Terminal 3 - Start Dashboard:**

```bash
cd dashboard
yarn dev
```

Access the dashboard at `http://localhost:5173`

### Legitimate client and attack demonstrations

With the Plant running, use `uv run --project plant python legitimate_client/run.py --max-cycles 3` for a safe operator smoke test. The client is Modbus-only and needs no Backend.

For the attack suite, start the Backend with packet-capture privileges, then see [attacks/README.md](attacks/README.md) for the individual commands, expected detector results, and the replay-proxy setup.

## Testing

### Backend Tests

```bash
cd backend
uv run python tests/test_day17_confidence.py
uv run python tests/test_day18_detectors.py
uv run python tests/test_day21_integration.py
```

### Simulation Scenarios

```bash
cd backend
uv run python scripts/simulate_all.py
```

### Dashboard Build

```bash
cd dashboard
yarn build
```

## Detection Layers

### Layer 1 — Sanity Check

- Command formatting and type enforcement
- Boundary value validation
- Alert Level: `WARNING`, `CERTAIN`

### Layer 2 — State-Machine Validity

- Physics-based safety rules
- Evaluates commands against live physical state
- Alert Level: `CRITICAL`, `CERTAIN`

### Layer 3 — Replay Detection

- Sensor freeze and replay detection
- Compares readings with actuator activity
- Alert Level: `WARNING`, `NEEDS_REVIEW`

### Layer 4 — Drift Detection

- Cumulative rate analysis
- Catches gradual anomalous trends
- Alert Level: `WARNING`, `NEEDS_REVIEW`

## API Endpoints

- `GET /plant/live` - Current plant state
- `POST /commands/report` - Legacy debug endpoint; live commands are detected from Modbus traffic
- `GET /history/readings` - Historical readings
- `GET /history/commands` - Command history
- `GET /alerts` - Security alerts
- `POST /simulate/scenario` - Attack simulation

See [backend/API.md](backend/API.md) for complete API documentation.

## Project Structure

```
SafeCheck/
├── backend/          # FastAPI backend + detection engine
├── plant/            # Modbus plant simulator
├── dashboard/        # React dashboard
├── attacks/          # Attack scripts and vectors
└── docs/            # Documentation
```

## Team

SafeCheck_TrackE - ICSC Hackathon 2026

## License

See individual component directories for licensing information.
