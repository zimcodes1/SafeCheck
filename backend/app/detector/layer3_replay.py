from typing import Any, Iterable, Optional, Tuple


def _state_value(reading: Any, key: str):
    if isinstance(reading, dict):
        return reading.get(key)
    return getattr(reading, key, None)


def check_for_replay(
    new_reading: Any,
    recent_readings: Iterable[Any],
    min_samples: int = 3,
    min_cumulative_change: float = 1.0,
) -> Tuple[bool, Optional[str]]:
    """Detect replay or stuck readings.

    Returns (ok, reason) where ok=True when the reading appears normal, and
    ok=False with a reason when the recent sequence looks suspiciously unchanged
    despite the plant's pump activity.

    Heuristic used:
    - Require at least `min_samples` historical readings.
    - If the pump has been active in the majority of the window and the
      cumulative change in `water_level` across the window is less than
      `min_cumulative_change`, raise a replay alarm.

    This is intentionally conservative and tuned to detect long runs of
    identical or near-identical readings while the pump is expected to move
    the level.
    """
    window = list(recent_readings)
    if len(window) < min_samples:
        return True, None

    # oldest first
    oldest = window[0]
    newest = new_reading

    try:
        oldest_level = float(_state_value(oldest, "water_level") or 0.0)
        newest_level = float(_state_value(newest, "water_level") or 0.0)
    except Exception:
        return True, None

    # count pump activity across the window (including the new reading)
    pump_count = 0
    total_count = 0
    for r in window:
        ps = _state_value(r, "pump_state")
        if ps:
            pump_count += 1
        total_count += 1
    # include the new reading in counts
    if _state_value(newest, "pump_state"):
        pump_count += 1
    total_count += 1

    # compute cumulative change across the whole window (oldest -> newest)
    cumulative_delta = newest_level - oldest_level

    # condition: pump active in majority and level barely changed
    pump_majority = pump_count > (total_count // 2)

    if pump_majority and cumulative_delta < float(min_cumulative_change):
        return False, f"Replay/stuck readings: pump active but water level changed only {cumulative_delta:.2f} over {total_count} samples"

    return True, None


if __name__ == "__main__":
    # basic smoke tests
    base = {"water_level": 50.0, "pump_state": True}
    same = {"water_level": 50.0, "pump_state": True}
    higher = {"water_level": 55.0, "pump_state": True}

    print(check_for_replay(same, [base, base, base], min_samples=3, min_cumulative_change=1.0))
    print(check_for_replay(higher, [base, base, base], min_samples=3, min_cumulative_change=1.0))
    print(check_for_replay(same, [base, base], min_samples=3, min_cumulative_change=1.0))
