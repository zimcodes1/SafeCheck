from __future__ import annotations
import logging
from common.config import PLANT_HOST, PLANT_PORT, SOURCE_PORTS
from common.client_helper import PlantClient
from injection.attack import run_injection

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
client = PlantClient(PLANT_HOST, PLANT_PORT, SOURCE_PORTS["injection"], logging.getLogger("attack.injection"))
try:
    client.connect(); run_injection(client)
finally:
    client.close()
