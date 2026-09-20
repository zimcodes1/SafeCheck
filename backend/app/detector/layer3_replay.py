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
    levels = []

    for r in window:
        if _state_value(r, "pump_state"):
            pump_count += 1
        lvl = _state_value(r, "water_level")
        if lvl is not None:
            levels.append(float(lvl))
        total_count += 1

    # include the new reading in counts
    if _state_value(newest, "pump_state"):
        pump_count += 1
    if newest_level is not None:
        levels.append(float(newest_level))
    total_count += 1

    if not levels:
        return True, None

    max_level = max(levels)
    min_level = min(levels)
    level_variation = max_level - min_level

    # A replay anomaly occurs when the pump is continuously engaged throughout the sample
    # window, but the reported water level remains completely frozen / unchanged.
    # Note: If the tank is already at capacity (>=99%), level cannot physically rise.
    pump_active_throughout = (pump_count == total_count)
    tank_at_capacity = newest_level >= 99.0

    if pump_active_throughout and not tank_at_capacity and level_variation < float(min_cumulative_change):
        return False, (
            f"Sensor anomaly: pump has been continuously active but water level remained frozen (variation {level_variation:.2f} over {total_count} samples). "
            "Possible sensor replay, transmission failure, or device hang — investigate sensors and connectivity."
        )

    return True, None


if __name__ == "__main__":
    # basic smoke tests
    base = {"water_level": 50.0, "pump_state": True}
    same = {"water_level": 50.0, "pump_state": True}
    higher = {"water_level": 55.0, "pump_state": True}

    print(check_for_replay(same, [base, base, base], min_samples=3, min_cumulative_change=1.0))
    print(check_for_replay(higher, [base, base, base], min_samples=3, min_cumulative_change=1.0))
    print(check_for_replay(same, [base, base], min_samples=3, min_cumulative_change=1.0))
