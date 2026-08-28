# plant_server/config.py — shape only
class PlantConfig:
    modbus_port: int = 5020
    tick_interval_seconds: float = 1.0
    danger_level_threshold: float = 95.0
    danger_pump_valve_seconds: int = 5