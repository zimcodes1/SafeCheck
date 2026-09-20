from __future__ import annotations
import argparse
import logging
from common.config import PLANT_HOST, PLANT_PORT, SOURCE_PORTS
from common.client_helper import PlantClient
from slow_drift.attack import run_slow_drift

parser = argparse.ArgumentParser(description="Run the SafeCheck Layer-4 underperformance demonstration.")
parser.add_argument("--duration", type=float, default=20.0, help="Duration in seconds to hold the underperforming state")
parser.add_argument("--timeout", type=float, default=60.0, help="Max seconds to wait for natural fill phase")
parser.add_argument("--no-wait", action="store_true", help="Actively force filling phase immediately instead of waiting")
args = parser.parse_args()
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
client = PlantClient(PLANT_HOST, PLANT_PORT, SOURCE_PORTS["slow_drift"], logging.getLogger("attack.slow_drift"))
try:
    client.connect()
    run_slow_drift(
        client,
        duration_seconds=args.duration,
        timeout_seconds=args.timeout,
        wait_for_fill=not args.no_wait,
    )
finally:
    client.close()
