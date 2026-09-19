from __future__ import annotations
import argparse
import logging
from common.config import PLANT_HOST, PLANT_PORT, SOURCE_PORTS
from common.client_helper import PlantClient
from maintenance_scenario.scenario import run_maintenance

parser = argparse.ArgumentParser(description="Run SafeCheck's benign maintenance scenario.")
parser.add_argument("--cycles", type=int, default=3)
parser.add_argument("--hold-seconds", type=float, default=2.0)
args = parser.parse_args()
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
client = PlantClient(PLANT_HOST, PLANT_PORT, SOURCE_PORTS["maintenance"], logging.getLogger("maintenance"))
try:
    client.connect(); run_maintenance(client, args.cycles, args.hold_seconds)
finally:
    client.close()
