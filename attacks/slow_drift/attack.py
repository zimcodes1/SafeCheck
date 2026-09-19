"""Hold pump and valve open so pump-on readings show sustained underperformance."""
from __future__ import annotations
import time
from common.client_helper import PlantClient


def run_slow_drift(client: PlantClient, duration_seconds: float = 20.0) -> None:
    # With both actuators active, the Plant's level remains nearly unchanged.
    # That gradual, low-signal mismatch is what Layer 4 is designed to flag.
    client.write_pump(True)
    client.write_valve(True)
    time.sleep(duration_seconds)
    client.write_pump(False)
    client.write_valve(False)
