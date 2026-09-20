from __future__ import annotations
import logging
from common.config import PLANT_HOST, PLANT_PORT, SOURCE_PORTS
from common.client_helper import PlantClient
from wrong_moment.attack import run_wrong_moment

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
client = PlantClient(PLANT_HOST, PLANT_PORT, SOURCE_PORTS["wrong_moment"], logging.getLogger("attack.wrong_moment"))
try:
    client.connect(); run_wrong_moment(client)
finally:
    client.close()
