from __future__ import annotations

from typing import Any, Optional, Tuple

from app.models.command import Command, CommandType


UNSAFE_COMBINATIONS = [
    (
        "pump",
        True,
        "valve closed and high water",
        "Pump cannot remain on while the valve is closed and the tank is already near full.",
    ),
    (
        "valve",
        False,
        "pump running and high water",
        "Closing the valve while the pump is running and the tank is already near full is unsafe.",
    ),
]

DANGER_THRESHOLD = 95.0


def _state_value(current_state: Any, key: str) -> Any:
    if isinstance(current_state, dict):
        return current_state.get(key)
    return getattr(current_state, key, None)


def check_state_validity(command: Command | Any, current_plant_state: Any) -> Tuple[bool, Optional[str]]:
    """Check whether a command is valid for the current plant state.

    The real danger condition is not "valve closed" by itself; it is a closed
    valve combined with an active pump and a near-full tank. This matches the
    plant brief exactly:

    - pump on / staying on while valve is closed and water is >= threshold
    - valve close while pump is running and water is >= threshold

    Returns a `(ok, reason)` tuple, where `ok` is `True` when the command is
    state-valid and `reason` is `None` on success.
    """
    if command is None:
        return False, "Command is missing"

    command_type = getattr(command, "command_type", None)
    value = getattr(command, "value", None)

    if not isinstance(command_type, CommandType):
        return False, "Command type is invalid"

    if value is None or not isinstance(value, bool):
        return False, "Command value is invalid"

    if current_plant_state is None:
        return False, "Current plant state is missing"

    valve_state = _state_value(current_plant_state, "valve_state")
    pump_state = _state_value(current_plant_state, "pump_state")
    water_level = _state_value(current_plant_state, "water_level")
    threshold = _state_value(current_plant_state, "danger_level_threshold")
    if threshold is None:
        threshold = DANGER_THRESHOLD

    if water_level is None:
        return False, "Current water level is missing"

    high_water = float(water_level) >= float(threshold)
    valve_closed = valve_state is False
    pump_running = pump_state is True

    if command_type == CommandType.PUMP and value is True:
        if valve_closed and pump_running and high_water:
            return False, "Pump cannot remain on while the valve is closed and the tank is already near full."
        if valve_closed and high_water:
            return False, "Pump cannot start while the valve is closed and the tank is already near full."

    if command_type == CommandType.VALVE and value is False:
        if pump_running and valve_closed and high_water:
            return False, "Closing the valve while the pump is running and the tank is already near full is unsafe."
        if pump_running and high_water:
            return False, "Closing the valve while the pump is running and the tank is already near full is unsafe."

    return True, None


if __name__ == "__main__":
    class PlantState:
        valve_state = False
        pump_state = False

    class CommandStub:
        command_type = CommandType.PUMP
        value = True

    print(check_state_validity(CommandStub(), PlantState()))
    print(check_state_validity(CommandStub(), {"valve_state": True, "pump_state": False}))
