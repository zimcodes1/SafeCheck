from datetime import datetime, timedelta

from app.detector.layer1_sanity import check_sanity
from app.detector.layer2_state_machine import check_state_validity
from app.detector.layer3_replay import check_for_replay
from app.detector.layer4_drift import check_for_drift
from app.detector.engine import evaluate_command, evaluate_reading
from app.database import init_db
from app.models.command import CommandType
from app.schemas.reading import ReadingOut
from app.models.alert import RulesEnum, ConfidenceEnum


def test_layer1_sanity_bad_value():
    class C:
        command_type = CommandType.PUMP
        value = "notbool"
        source_id = "t"

    ok, reason = check_sanity(C())
    assert not ok and reason is not None


def test_layer2_state_machine_high_water():
    class C:
        command_type = CommandType.PUMP
        value = True

    current = {"valve_state": False, "pump_state": True, "water_level": 95.0, "danger_level_threshold": 95.0}
    ok, reason = check_state_validity(C(), current)
    assert not ok and "near full" in reason.lower()


def test_layer3_replay_detection():
    base = {"water_level": 50.0, "pump_state": True}
    same = {"water_level": 50.0, "pump_state": True}
    ok, reason = check_for_replay(same, [base, base, base], min_samples=3, min_cumulative_change=1.0)
    assert not ok and "sensor anomaly" in reason.lower()


def test_layer4_drift_detection():
    now = datetime.now()
    old = {"water_level": 50.0, "pump_state": False, "timestamp": now - timedelta(seconds=300)}
    new = {"water_level": 57.0, "pump_state": False, "timestamp": now}
    ok, reason = check_for_drift(new, [old, old, old], min_samples=3, drift_rate_threshold=0.01)
    assert not ok and "slow rise" in reason.lower()


def test_engine_evaluate_command_and_reading():
    init_db()
    # sanity-fail command
    bad = type("C", (), {"command_type": CommandType.PUMP, "value": "no", "source_id": "t"})()
    cmd, alert = evaluate_command(bad)
    assert cmd is None and alert is not None

    # valid command persists
    good = type("C", (), {"command_type": CommandType.VALVE, "value": False, "source_id": "t"})()
    cmd2, alert2 = evaluate_command(good)
    assert cmd2 is not None and alert2 is None

    # reading -> drift alert
    now = datetime.now()
    old = ReadingOut(water_level=50.0, pump_state=False, valve_state=False, timestamp=now - timedelta(seconds=300), id=None, source='plant')
    new = ReadingOut(water_level=57.0, pump_state=False, valve_state=False, timestamp=now, id=None, source='plant')
    _, rdr_alert = evaluate_reading(new, [old, old, old])
    assert rdr_alert is not None
    assert rdr_alert["rule_triggered"] == RulesEnum.DRIFT
    assert rdr_alert["confidence"] == ConfidenceEnum.NEEDS_REVIEW


if __name__ == "__main__":
    test_layer1_sanity_bad_value()
    test_layer2_state_machine_high_water()
    test_layer3_replay_detection()
    test_layer4_drift_detection()
    test_engine_evaluate_command_and_reading()
    print("test_day18_detectors: ok")
