"""Run the replay demonstration through a local Modbus TCP MITM proxy."""
from __future__ import annotations

from common.client_helper import PlantClient


def begin_hidden_drain(client: PlantClient) -> None:
    """Open the real Plant valve while proxy clients keep seeing a frozen snapshot."""
    client.write_pump(False)
    client.write_valve(True)
