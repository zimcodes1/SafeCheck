"""Simulation helpers for Day 19.

Provides programmatic access to the same scenarios exercised by
`scripts/simulate_all.py` so the `/simulate/scenario` endpoint can trigger them.
"""
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.database import init_db
from app.detector.engine import evaluate_command, evaluate_reading
from app.schemas.command import CommandIn
from app.models.command import CommandType
from app.schemas.reading import ReadingOut


def _now(offset_seconds: int = 0):
    return datetime.now() + timedelta(seconds=offset_seconds)


def _make_reading(water: float, pump: bool, valve: bool, t: Optional[datetime] = None) -> ReadingOut:
    return ReadingOut(water_level=water, pump_state=pump, valve_state=valve, timestamp=t or datetime.now(), id=None, source='sim')


def run_scenario(name: str) -> Dict[str, Any]:
    """Run a single named scenario and return the result payload.

    This function writes to the DB in the same manner `evaluate_*` helpers do
    (creating Alerts / Commands as needed) and returns a serializable dict
    describing what happened.
    """
    init_db()
    name = name.lower()
    if name == "normal_operation":
        window = [
            _make_reading(30.0, False, True, _now(-60)),
            _make_reading(30.2, False, True, _now(-30)),
            _make_reading(30.1, False, True, _now(-10)),
        ]
        new = _make_reading(30.3, False, True, _now(0))
        _, alert = evaluate_reading(new, window)
        return {"scenario": name, "alert": alert}

    if name == "state_machine_violation":
        cmd = CommandIn(command_type=CommandType.PUMP, value=True, source_id="sim")
        current_state = {"valve_state": False, "pump_state": True, "water_level": 96.0, "danger_level_threshold": 95.0}
        cmd_res, cmd_alert = evaluate_command(cmd, current_state)
        return {"scenario": name, "command": cmd_res, "alert": cmd_alert}

    if name == "invalid_command":
        # Create a lightweight object to simulate malformed input
        try:
            bad_cmd = CommandIn(command_type=CommandType.PUMP, value="invalid", source_id="sim")
        except Exception:
            bad_cmd = type("BadCmd", (), {"command_type": CommandType.PUMP, "value": "invalid", "source_id": "sim"})()
        bad_res, bad_alert = evaluate_command(bad_cmd)
        return {"scenario": name, "command": bad_res, "alert": bad_alert}

    if name == "replay_stuck":
        base = _make_reading(50.0, True, True, _now(-60))
        window = [base, base, base]
        new = _make_reading(50.0, True, True, _now(0))
        _, alert = evaluate_reading(new, window)
        return {"scenario": name, "alert": alert}

    if name == "drift_leak_rise":
        old = _make_reading(50.0, False, True, _now(-300))
        window = [old, old, old]
        new = _make_reading(57.0, False, True, _now(0))
        _, alert = evaluate_reading(new, window)
        return {"scenario": name, "alert": alert}

    if name == "drift_pump_underperform":
        old = _make_reading(50.0, True, True, _now(-300))
        window = [old, old, old]
        new = _make_reading(50.5, True, True, _now(0))
        _, alert = evaluate_reading(new, window)
        return {"scenario": name, "alert": alert}

    if name == "insufficient_samples":
        window = [_make_reading(10.0, True, True, _now(-10)), _make_reading(11.0, True, True, _now(-5))]
        new = _make_reading(12.0, True, True, _now(0))
        _, alert = evaluate_reading(new, window)
        return {"scenario": name, "alert": alert}

    if name == "combined_replay_drift":
        base = _make_reading(40.0, True, False, _now(-300))
        window = [base, base, base]
        new = _make_reading(40.0, True, False, _now(0))
        _, alert = evaluate_reading(new, window)
        return {"scenario": name, "alert": alert}

    raise ValueError(f"Unknown scenario: {name}")


def list_scenarios() -> List[str]:
    return [
        "normal_operation",
        "state_machine_violation",
        "invalid_command",
        "replay_stuck",
        "drift_leak_rise",
        "drift_pump_underperform",
        "insufficient_samples",
        "combined_replay_drift",
    ]
