"""One unsolicited but structurally valid command injection."""
from common.client_helper import PlantClient


def run_injection(client: PlantClient) -> None:
    _, pump_on, _ = client.read_state()
    client.write_pump(not pump_on)
