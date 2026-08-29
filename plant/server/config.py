import os

class PlantConfig:
    """Configuration settings for the Plant Modbus server and physical simulation."""
    # Modbus TCP network settings
    modbus_host: str = os.getenv("PLANT_HOST", "0.0.0.0")
    modbus_port: int = int(os.getenv("PLANT_PORT", "5020"))
    
    # Simulation timing
    tick_interval_seconds: float = float(os.getenv("PLANT_TICK_INTERVAL", "1.0"))
    
    # Danger condition thresholds
    danger_level_threshold: float = float(os.getenv("PLANT_DANGER_LEVEL_THRESHOLD", "95.0"))
    danger_pump_valve_seconds: int = int(os.getenv("PLANT_DANGER_PUMP_VALVE_SECONDS", "5"))