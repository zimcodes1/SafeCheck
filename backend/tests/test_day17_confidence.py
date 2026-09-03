import sys
from pathlib import Path
from datetime import datetime, timedelta

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.database import init_db
from app.detector.engine import evaluate_reading
from app.schemas.reading import ReadingOut
from app.models.alert import ConfidenceEnum, RulesEnum


def test_drift_alert_confidence():
    """Drift detector should create an alert with NEEDS_REVIEW confidence."""
    init_db()

    now = datetime.now()
    old = ReadingOut(water_level=50.0, pump_state=False, valve_state=False, timestamp=now - timedelta(seconds=300), id=None, source='plant')
    # pronounced rise while pump OFF -> should trigger drift
    new = ReadingOut(water_level=57.0, pump_state=False, valve_state=False, timestamp=now, id=None, source='plant')
    window = [old, old, old]

    _, alert = evaluate_reading(new, window)
    assert alert is not None, "Expected an alert for drift"
    assert alert["rule_triggered"] == RulesEnum.DRIFT
    assert alert["confidence"] == ConfidenceEnum.NEEDS_REVIEW


if __name__ == "__main__":
    test_drift_alert_confidence()
    print("test_day17_confidence: ok")
