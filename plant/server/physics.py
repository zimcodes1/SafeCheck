from dataclasses import dataclass

from server.config import PlantConfig


@dataclass
class TankState:
    """Holds the physical state of the water tank plant."""

    water_level: float = 0.0
    pump_state: bool = False
    valve_state: bool = False
    is_in_danger: bool = False

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
        elif self.valve_state and not self.pump_state:
            self.water_level = max(0.0, self.water_level - 1.0)

        self._refresh_danger_state()

    def _refresh_danger_state(self) -> None:
        """Danger = pump active + valve closed + tank already near full.

        This is the real unsafe condition for the plant: the tank has no room to
        take more incoming water. A closed valve at low or mid water is normal and
        safe; only when the water is already near capacity is it dangerous.
        """
        danger_threshold = PlantConfig.danger_level_threshold
        valve_closed = not self.valve_state
        pump_running = self.pump_state
        high_water = self.water_level >= danger_threshold

        self.is_in_danger = pump_running and valve_closed and high_water


if __name__ == "__main__":
    tank = TankState(water_level=50.0, pump_state=True)
    tank.tick()
    print(f"pump on -> {tank.water_level}, danger={tank.is_in_danger}")

    tank = TankState(water_level=50.0, valve_state=True)
    tank.tick()
    print(f"valve open -> {tank.water_level}, danger={tank.is_in_danger}")

    tank = TankState(water_level=95.0, pump_state=True, valve_state=False)
    tank.tick()
    print(f"high water + pump -> {tank.water_level}, danger={tank.is_in_danger}")