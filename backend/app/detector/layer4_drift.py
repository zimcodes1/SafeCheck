from typing import Any, Iterable, Optional, Tuple
from datetime import datetime


def _state_value(reading: Any, key: str):
    if isinstance(reading, dict):
        return reading.get(key)
    return getattr(reading, key, None)


def _timestamp_seconds(reading: Any) -> float:
    ts = _state_value(reading, "timestamp")
    if ts is None:
        return 0.0
    if isinstance(ts, datetime):
        return ts.timestamp()
    try:
        # assume it's an ISO string
        return datetime.fromisoformat(ts).timestamp()
    except Exception:
        return 0.0


def check_for_drift(
    new_reading: Any,
    recent_readings: Iterable[Any],
    min_samples: int = 3,
    max_window_seconds: float = 600.0,
    drift_rate_threshold: float = 0.02,
) -> Tuple[bool, Optional[str]]:
    """Detect slow drift or leaks in `water_level` over time.

    Heuristic:
    - Require at least `min_samples` readings.
    - Compute average per-second change across the window (oldest -> newest).
    - If pump is OFF for the majority but level is rising faster than
      `drift_rate_threshold` per second, flag a possible leak/drift.
    - If pump is ON for the majority but level increase rate is smaller than
      `drift_rate_threshold` (i.e., pump not producing expected rise), flag.

    Returns (ok, reason) where ok=True means no drift detected.
    """
    window = list(recent_readings)
    if len(window) < min_samples:
        return True, None

    oldest = window[0]
    newest = new_reading

    try:
        oldest_level = float(_state_value(oldest, "water_level") or 0.0)
        newest_level = float(_state_value(newest, "water_level") or 0.0)
    except Exception:
        return True, None

    t_old = _timestamp_seconds(oldest)
    t_new = _timestamp_seconds(newest)
    dt = max(1.0, t_new - t_old)
    rate = (newest_level - oldest_level) / dt

    # pump activity majority
    pump_count = 0
    total = 0
    for r in window:
        if _state_value(r, "pump_state"):
            pump_count += 1
        total += 1
    if _state_value(newest, "pump_state"):
        pump_count += 1
    total += 1

    pump_majority = pump_count > (total // 2)

    # If pump is mostly off but level is rising -> leak
    if not pump_majority and rate > drift_rate_threshold:
        return False, (
            f"Slow rise detected while pump is mostly OFF: level increased {newest_level - oldest_level:.2f} over {dt:.0f}s (rate {rate:.4f}/s). "
            "Possible leak, sensor bias, or background inflow."
        )

    # If pump is mostly on but level not rising sufficiently -> underperform
    if pump_majority and rate < drift_rate_threshold:
        return False, (
            f"Underperformance detected while pump is mostly ON: level changed {newest_level - oldest_level:.2f} over {dt:.0f}s (rate {rate:.4f}/s). "
            "Possible pump failure, blockage, or measurement issue."
        )

    return True, None


if __name__ == "__main__":
    from datetime import datetime, timedelta

    now = datetime.now()
    old = {"water_level": 50.0, "pump_state": False, "timestamp": now - timedelta(seconds=300)}
    new = {"water_level": 52.0, "pump_state": False, "timestamp": now}
    print(check_for_drift(new, [old, old, old], min_samples=3, drift_rate_threshold=0.01))