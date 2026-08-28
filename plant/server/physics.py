
from dataclasses import dataclass

@dataclass
class TankState:
    """Holds the physical state of the water tank plant."""
    water_level: float = 0.0
    pump_state: bool = False
    valve_state: bool = False