"""Shared, Modbus-only configuration for SafeCheck attack demonstrations."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLANT_ROOT = ROOT / "plant"
if str(PLANT_ROOT) not in sys.path:
    sys.path.insert(0, str(PLANT_ROOT))

from server.config import PlantConfig  # noqa: E402
from server.registers import PUMP_COMMAND_REGISTER, VALVE_COMMAND_REGISTER, WATER_LEVEL_REGISTER  # noqa: E402

PLANT_HOST = os.getenv("PLANT_HOST", "127.0.0.1")
PLANT_PORT = int(os.getenv("PLANT_PORT", "5020"))
DANGER_LEVEL_THRESHOLD = float(os.getenv("PLANT_DANGER_LEVEL_THRESHOLD", str(PlantConfig.danger_level_threshold)))
SOURCE_PORTS = {"injection": 6002, "wrong_moment": 6003, "slow_drift": 6004, "replay": 6005, "maintenance": 6006, "malformed": 6007}
