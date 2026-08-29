"""Modbus client service for the backend.

Provides helpers to read the live plant state over Modbus TCP.

Primary function:
 - `read_plant_state()` (async): connect to the Plant and return (water_level, pump_state, valve_state)

A synchronous wrapper `read_plant_state_sync()` is also provided for convenience.
"""

import asyncio
import logging
from typing import Tuple

from pymodbus.client import AsyncModbusTcpClient

from app.config import Settings

logger = logging.getLogger(__name__)

# Register addresses (shared contract with the Plant component)
PUMP_COMMAND_REGISTER = 0
VALVE_COMMAND_REGISTER = 1

# Input registers
WATER_LEVEL_REGISTER = 0
PUMP_STATUS_REGISTER = 1
VALVE_STATUS_REGISTER = 2


async def read_plant_state(host: str | None = None, port: int | None = None, timeout: float = 3.0) -> Tuple[int, int, int]:
	"""Read the plant input registers and return plain Python values.

	Returns a tuple: `(water_level, pump_status, valve_status)` where each value
	is an integer (water level 0-100, pump/valve 0 or 1).

	Raises on connection/read failures.
	"""
	settings = Settings()
	host = host or settings.plant_host
	port = port or settings.plant_port

	client = AsyncModbusTcpClient(host=host, port=port)
	try:
		connected = await asyncio.wait_for(client.connect(), timeout=timeout)
	except Exception as exc:  # pragma: no cover - network behaviour
		logger.exception("Failed to connect to plant %s:%s", host, port)
		raise

	if not connected:
		raise ConnectionError(f"Could not connect to Plant at {host}:{port}")

	try:
		rr = await client.read_input_registers(address=WATER_LEVEL_REGISTER, count=3)
		if rr.isError():
			raise RuntimeError(f"Modbus read error: {rr}")
		regs = rr.registers
		# Ensure we have three values (water, pump, valve)
		if len(regs) < 3:
			raise RuntimeError(f"Unexpected register count: {regs}")
		water_level = int(regs[0])
		pump_state = int(regs[1])
		valve_state = int(regs[2])
		return water_level, pump_state, valve_state
	finally:
		try:
			client.close()
		except Exception:
			pass


def read_plant_state_sync(host: str | None = None, port: int | None = None, timeout: float = 3.0):
	"""Synchronous wrapper around `read_plant_state` for convenience in scripts.

	Returns the same tuple as `read_plant_state`.
	"""
	return asyncio.run(read_plant_state(host=host, port=port, timeout=timeout))

if __name__ == '__main__':
	# Example usage
    state = read_plant_state_sync()
    print(f"Plant state: water_level={state[0]}, pump_state={state[1]}, valve_state={state[2]}")