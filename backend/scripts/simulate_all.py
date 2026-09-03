"""Simulate Day 19: exercise detectors and engine across exhaustive scenarios.

Run from the `backend` folder with the virtualenv activated:

    python scripts/simulate_all.py

The script prints a concise report and writes `simulation_results.json`.
"""
import json
import sys
from datetime import datetime, timedelta
from typing import List

# Ensure backend/ is on sys.path so `import app` works when running this file
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.database import init_db
from app.detector.engine import evaluate_command, evaluate_reading
from app.schemas.command import CommandIn
from app.models.command import CommandType
from app.schemas.reading import ReadingOut


def ts(offset_seconds: int = 0):
    return datetime.now() + timedelta(seconds=offset_seconds)


def make_reading(water, pump, valve, t=None):
    return ReadingOut(water_level=water, pump_state=pump, valve_state=valve, timestamp=t or datetime.now(), id=None, source='sim')


def run_scenarios() -> List[dict]:
    init_db()
    results = []

    # Scenario 1: Normal operation (pump off, valve open, level stable)
    window = [make_reading(30.0, False, True, ts(-60)), make_reading(30.2, False, True, ts(-30)), make_reading(30.1, False, True, ts(-10))]
    new = make_reading(30.3, False, True, ts(0))
    _, alert = evaluate_reading(new, window)
    results.append({"scenario": "normal_operation", "alert": alert})

    # Scenario 2: State-machine violation (pump ON while valve CLOSED and high water)
    cmd = CommandIn(command_type=CommandType.PUMP, value=True, source_id="sim")
    current_state = {"valve_state": False, "pump_state": True, "water_level": 96.0, "danger_level_threshold": 95.0}
    cmd_res, cmd_alert = evaluate_command(cmd, current_state)
    results.append({"scenario": "state_machine_violation", "command": cmd_res, "alert": cmd_alert})

    # Scenario 3: Invalid command (sanity)
    # Bypass CommandIn validation to simulate malformed input at the engine level.
    from typing import cast
    bad_cmd = cast(CommandIn, type("BadCmd", (), {"command_type": CommandType.PUMP, "value": "invalid", "source_id": "sim"})())
    bad_res, bad_alert = evaluate_command(bad_cmd)
    results.append({"scenario": "invalid_command", "command": bad_res, "alert": bad_alert})

    # Scenario 4: Replay/stuck readings (pump active but no level change)
    base = make_reading(50.0, True, True, ts(-60))
    window = [base, base, base]
    new = make_reading(50.0, True, True, ts(0))
    _, alert = evaluate_reading(new, window)
    results.append({"scenario": "replay_stuck", "alert": alert})

    # Scenario 5: Drift - slow rise with pump OFF (leak)
    old = make_reading(50.0, False, True, ts(-300))
    window = [old, old, old]
    new = make_reading(57.0, False, True, ts(0))
    _, alert = evaluate_reading(new, window)
    results.append({"scenario": "drift_leak_rise", "alert": alert})

    # Scenario 6: Drift - pump ON but underperforming
    old = make_reading(50.0, True, True, ts(-300))
    window = [old, old, old]
    new = make_reading(50.5, True, True, ts(0))
    _, alert = evaluate_reading(new, window)
    results.append({"scenario": "drift_pump_underperform", "alert": alert})

    # Scenario 7: Edge case - insufficient samples
    window = [make_reading(10.0, True, True, ts(-10)), make_reading(11.0, True, True, ts(-5))]
    new = make_reading(12.0, True, True, ts(0))
    _, alert = evaluate_reading(new, window)
    results.append({"scenario": "insufficient_samples", "alert": alert})

    # Scenario 8: Combined anomalies - replay + drift
    base = make_reading(40.0, True, False, ts(-300))
    window = [base, base, base]
    new = make_reading(40.0, True, False, ts(0))
    _, alert = evaluate_reading(new, window)
    results.append({"scenario": "combined_replay_drift", "alert": alert})

    return results


def main():
    results = run_scenarios()
    # Print concise table
    for r in results:
        sc = r.get("scenario")
        alert = r.get("alert")
        print(f"{sc}: alert={'yes' if alert else 'no'}", end="")
        if alert:
            print(f" rule={alert.get('rule_triggered')} confidence={alert.get('confidence')}")
        else:
            print("")

    # save to file
    with open("simulation_results.json", "w") as fh:
        json.dump(results, fh, default=str, indent=2)


if __name__ == "__main__":
    main()
