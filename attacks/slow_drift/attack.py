"""Context-aware slow drift / underperformance demonstration for SafeCheck Layer 4."""
from __future__ import annotations
import time
from common.client_helper import PlantClient


def run_slow_drift(
    client: PlantClient,
    duration_seconds: float = 20.0,
    check_interval: float = 0.5,
    timeout_seconds: float = 60.0,
    wait_for_fill: bool = True,
) -> None:
    """Synchronize with plant state and induce a sustained underperformance condition.

    1. Inspects plant state to find or establish an active filling phase (pump=ON, valve=CLOSED).
    2. Opens the drain valve alongside the running pump to stall the rise (net rate ~ 0.0/s).
    3. Actively maintains this state against concurrent operator commands for duration_seconds.
    4. Triggers Layer 4 Underperformance alert reliably without accidental normal behavior.
    """
    logger = client.logger
    start_time = time.time()

    # Step 1: Context check / synchronization
    level, pump_on, valve_open = client.read_state()
    logger.info("DRIFT_START | Current state: level=%.1f%% pump=%s valve=%s", level, pump_on, valve_open)

    # Check if plant is already in an ideal filling window (pump ON, valve CLOSED, healthy mid-level)
    is_filling = pump_on and not valve_open and 35.0 <= level <= 80.0

    if wait_for_fill and not is_filling:
        logger.info("DRIFT_SYNC | Waiting for plant to enter legitimate fill phase (pump=ON, level 35-80%%)...")
        while time.time() - start_time < timeout_seconds:
            level, pump_on, valve_open = client.read_state()
            if pump_on and not valve_open and 35.0 <= level <= 80.0:
                logger.info("DRIFT_LOCKED | Plant is actively filling at level=%.1f%%. Ready to strike!", level)
                is_filling = True
                break
            time.sleep(check_interval)

        if not is_filling:
            logger.warning("DRIFT_TIMEOUT | Timed out waiting for natural fill phase. Actively priming filling state...")
            client.write_valve(False)
            client.write_pump(True)
            # Hold for a few seconds so backend poller registers pump=ON
            time.sleep(4.0)

    # Step 2: Strike and maintain underperformance
    strike_start = time.time()
    initial_level, _, _ = client.read_state()
    logger.warning(
        "DRIFT_STRIKE | Inducing underperformance: forcing valve=OPEN while pump=ON (baseline level=%.1f%%)",
        initial_level,
    )

    last_log_time = 0.0
    while time.time() - strike_start < duration_seconds:
        # Actively reassert both actuators to prevent concurrent client from breaking the window
        client.write_pump(True)
        client.write_valve(True)

        now = time.time()
        if now - last_log_time >= 2.0:
            curr_level, _, _ = client.read_state()
            elapsed = now - strike_start
            logger.info("DRIFT_ACTIVE | elapsed=%.1fs level=%.1f%% (delta=%.1f%%)", elapsed, curr_level, curr_level - initial_level)
            last_log_time = now

        time.sleep(check_interval)

    logger.info("DRIFT_COMPLETE | Attack duration finished. Releasing valve to restore safe state.")
    # Release valve so plant resumes normal operation safely
    client.write_valve(False)

