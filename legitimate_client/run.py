import sys

# ``operator.py`` is required by the component specification, but executing
# this file directly puts its directory ahead of the stdlib and would shadow
# Python's own ``operator`` module during argparse's imports.
if sys.path:
    sys.path.pop(0)

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from legitimate_client.config import OperatorSettings
from legitimate_client.operator import LegitimateOperator, setup_logging


def main() -> int:
    defaults = OperatorSettings()
    parser = argparse.ArgumentParser(description="Run SafeCheck's legitimate Modbus operator client.")
    parser.add_argument("--host", default=defaults.plant_host)
    parser.add_argument("--port", type=int, default=defaults.plant_port)
    parser.add_argument("--local-port", type=int, default=defaults.local_source_port)
    parser.add_argument("--max-cycles", type=int, default=None)
    args = parser.parse_args()
    settings = OperatorSettings(plant_host=args.host, plant_port=args.port, local_source_port=args.local_port)
    logger = setup_logging()
    logger.info("STARTUP | plant=%s:%s source_port=%s safe_to_fill=%.1f max_cycles=%s", settings.plant_host, settings.plant_port, settings.local_source_port, settings.safe_to_fill_level, args.max_cycles)
    operator = LegitimateOperator(settings, logger)
    try:
        operator.run(args.max_cycles)
    except KeyboardInterrupt:
        logger.info("SHUTDOWN | KeyboardInterrupt received; closing Modbus connection")
    finally:
        operator.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
