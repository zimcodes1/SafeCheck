"""Create a safe setup, wait for high water, then reaffirm pump-on dangerously."""
from __future__ import annotations
import time
from common.config import DANGER_LEVEL_THRESHOLD
from common.client_helper import PlantClient


def run_wrong_moment(client: PlantClient, check_interval: float = 1.0) -> None:
    # These preparatory commands are safe while the water is low; the final,
    # redundant pump-on command is the deliberately dangerous command.
    client.write_valve(False)
    client.write_pump(True)
    while True:
        level, _, valve_open = client.read_state()
        if level >= DANGER_LEVEL_THRESHOLD and not valve_open:
            client.write_pump(True)
            return
        time.sleep(check_interval)
