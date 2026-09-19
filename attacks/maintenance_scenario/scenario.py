"""Expected maintenance activity: valve exercise while the pump stays off."""
from __future__ import annotations
import time
from common.client_helper import PlantClient


def run_maintenance(client: PlantClient, cycles: int = 3, hold_seconds: float = 2.0) -> None:
    client.write_pump(False)
    for _ in range(cycles):
        client.write_valve(True)
        time.sleep(hold_seconds)
        client.write_valve(False)
        time.sleep(hold_seconds)
