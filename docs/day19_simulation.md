# Day 19 — Exhaustive Simulation Scenarios

This document describes the simulation harness `backend/scripts/simulate_all.py` and the scenarios it exercises.

How to run

From the `backend` directory with the virtualenv activated:

```bash
python scripts/simulate_all.py
```

The script prints a short report and writes `simulation_results.json` into the current directory.

Scenarios

1. Normal operation
   - Description: pump OFF, valve OPEN, water level stable.
   - Trigger: send a window of stable `ReadingOut` samples and a new stable reading.
   - Expected: no alert.

2. State-machine violation
   - Description: issuing a PUMP ON command while the valve is CLOSED and the tank is near full.
   - Trigger: call `evaluate_command()` with `CommandIn(command_type=PUMP, value=True)` and `current_plant_state` containing `valve_state=False`, `pump_state=True`, `water_level>=danger_threshold`.
   - Expected: an alert with `rule_triggered = state_machine` and `confidence = certain`.

3. Invalid command (sanity)
   - Description: malformed command (wrong type for `value`).
   - Trigger: call `evaluate_command()` with `value` set to a non-boolean for the pump command.
   - Expected: alert with `rule_triggered = sanity_check` and `confidence = certain` (command not persisted).

4. Replay / stuck readings
   - Description: pump active but `water_level` unchanged across samples.
   - Trigger: window of identical readings with `pump_state=True` and a new identical reading.
   - Expected: alert with `rule_triggered = replay` and `confidence = needs_review`.

5. Drift — leak / slow rise
   - Description: pump OFF for the majority of window but `water_level` increases significantly.
   - Trigger: older low readings followed by a higher reading while pump OFF.
   - Expected: alert with `rule_triggered = drift` and `confidence = needs_review`.

6. Drift — pump underperforming
   - Description: pump ON for the majority but water level increases too slowly.
   - Trigger: pump ON across the window but very small cumulative change.
   - Expected: alert with `rule_triggered = drift` and `confidence = needs_review`.

7. Insufficient samples
   - Description: window shorter than `min_samples`.
   - Trigger: provide fewer than `min_samples` readings.
   - Expected: detectors skip and return no alert.

8. Combined replay + drift
   - Description: readings that both look replayed and show drift-like properties; engine prefers reporting `drift`.
   - Trigger: window demonstrating both conditions.
   - Expected: alert `drift` (preferred) with `confidence = needs_review`.

Notes

- The script uses the same `evaluate_command()` and `evaluate_reading()` functions used by the backend poller and API routes, so simulation exercises the real logic used in production.
- You can extend the script to write full JSON payloads to a test backend or to drive the Plant simulator for end-to-end runs.

API usage

You can trigger any scenario remotely via the backend HTTP API (Day 19 endpoint).

- POST `/api/simulate/scenario` — trigger a named scenario.

Example curl call:

```bash
curl -X POST http://localhost:8000/api/simulate/scenario \
   -H "Content-Type: application/json" \
   -d '{"scenario_name":"drift_leak_rise"}'
```

Example Python call (requests):

```python
import requests
res = requests.post(
      'http://localhost:8000/api/simulate/scenario',
      json={"scenario_name": "drift_leak_rise"},
)
print(res.json())
```

Response shape

The endpoint returns JSON of the form:

```json
{
   "ok": true,
   "result": { "scenario": "drift_leak_rise", "alert": { ... } }
}
```

If the scenario name is unknown the endpoint responds with a 404.
