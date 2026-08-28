from dataclasses import dataclass


@dataclass
class TankState:
    """Holds the physical state of the water tank plant."""

    water_level: float = 0.0
    pump_state: bool = False
    valve_state: bool = False

    def tick(self) -> None:
        """Advance a single simulation tick based on the current pump/valve state.

        The contract for Increment 6 is intentionally simple and pure:
        - pump on raises the level
        - valve open lowers the level
        - both on together mostly cancel out, so the water level stays roughly stable
        - the method does not know anything about Modbus or I/O
        """
        if self.pump_state and self.valve_state:
            # both active: net effect is neutral, matching the roadmap's 'mostly offset' wording
            return

        if self.pump_state and not self.valve_state:
            self.water_level = min(100.0, self.water_level + 1.0)
            return

        if self.valve_state and not self.pump_state:
            self.water_level = max(0.0, self.water_level - 1.0)


if __name__ == "__main__":
    tank = TankState(water_level=50.0, pump_state=True)
    tank.tick()
    print(f"pump on -> {tank.water_level}")

    tank = TankState(water_level=50.0, valve_state=True)
    tank.tick()
    print(f"valve open -> {tank.water_level}")

    tank = TankState(water_level=50.0, pump_state=True, valve_state=True)
    tank.tick()
    print(f"pump + valve -> {tank.water_level}")