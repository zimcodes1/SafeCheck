"""Verification for Increment 8: risk/danger detection on TankState."""

from server.physics import TankState


def test_normal_state_is_not_dangerous():
    tank = TankState(water_level=40.0, pump_state=False, valve_state=False)
    assert tank.is_in_danger is False


def test_pump_running_with_valve_closed_becomes_dangerous():
    tank = TankState(water_level=90.0, pump_state=True, valve_state=False)
    for _ in range(5):
        tank.tick()
    assert tank.is_in_danger is True


def test_high_water_with_valve_closed_is_dangerous():
    tank = TankState(water_level=95.0, pump_state=False, valve_state=False)
    tank.tick()
    assert tank.is_in_danger is True


def main():
    test_normal_state_is_not_dangerous()
    test_pump_running_with_valve_closed_becomes_dangerous()
    test_high_water_with_valve_closed_is_dangerous()
    print("[TEST SUCCESS] Increment 8 verification passed")


if __name__ == "__main__":
    main()
