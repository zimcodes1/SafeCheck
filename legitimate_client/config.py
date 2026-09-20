"""Configuration for the standalone SafeCheck legitimate operator client."""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path

# The Plant owns the shared register map.  Make the repository root importable
# when this file is executed directly from ``legitimate_client/``.
ROOT = Path(__file__).resolve().parents[1]
PLANT_ROOT = ROOT / "plant"
if str(PLANT_ROOT) not in sys.path:
    sys.path.insert(0, str(PLANT_ROOT))

from server.registers import (
    PUMP_COMMAND_REGISTER,
    VALVE_COMMAND_REGISTER,
    WATER_LEVEL_REGISTER,
)


def _range(name: str, default: tuple[int, int]) -> tuple[int, int]:
    raw = os.getenv(name)
    if raw is None:
        return default
    low, high = (int(part.strip()) for part in raw.split(",", 1))
    return low, high


@dataclass(frozen=True)
class OperatorSettings:
    plant_host: str = os.getenv("PLANT_HOST", "127.0.0.1")
    plant_port: int = int(os.getenv("PLANT_PORT", "5020"))
    local_source_port: int = int(os.getenv("LOCAL_SOURCE_PORT", "6001"))
    safe_to_fill_level: float = float(os.getenv("SAFE_TO_FILL_LEVEL", "30.0"))
    target_high_level: float = float(os.getenv("TARGET_HIGH_LEVEL", "78.0"))
    fill_duration_range: tuple[int, int] = _range("FILL_DURATION_RANGE", (45, 55))
    drain_duration_range: tuple[int, int] = _range("DRAIN_DURATION_RANGE", (45, 55))
    phase_pause_range: tuple[int, int] = _range("PHASE_PAUSE_RANGE", (4, 8))
    level_check_interval: float = float(os.getenv("LEVEL_CHECK_INTERVAL", "1.0"))
    max_guard_wait_seconds: float = float(os.getenv("MAX_GUARD_WAIT_SECONDS", "60"))
    reconnect_backoff_seconds: tuple[int, ...] = (1, 2, 5, 5, 5)
