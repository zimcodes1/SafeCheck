"""
Modbus TCP Server for SafeCheck Plant.
Provides a Modbus device whose live TankState is mirrored into holding and input registers.
"""

import asyncio
import contextlib
import logging
import warnings

# Filter pymodbus v4 transition deprecation warning for datastore context
warnings.filterwarnings("ignore", category=DeprecationWarning, module="pymodbus")

from pymodbus.server import StartAsyncTcpServer
from pymodbus.simulator import DataType, SimData, SimDevice
from server.config import PlantConfig
from server.physics import TankState
from server.registers import (
    PUMP_COMMAND_REGISTER,
    VALVE_COMMAND_REGISTER,
    WATER_LEVEL_REGISTER,
    PUMP_STATUS_REGISTER,
    VALVE_STATUS_REGISTER,
)

tank_state = TankState(water_level=50.0)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logging.getLogger("pymodbus").setLevel(logging.ERROR)
logger = logging.getLogger("plant.server")


def _live_input_registers() -> list[int]:
    """Return register values from the current TankState."""
    return [
        int(tank_state.water_level),
        int(tank_state.pump_state),
        int(tank_state.valve_state),
    ]


async def register_action(
    func_code,
    start_address,
    address,
    count,
    current_registers,
    values,
):
    """Keep the Modbus register map synchronized with tank state for Increment 5."""
    if values is not None:
        for offset, value in enumerate(values):
            register_address = address + offset
            if register_address == PUMP_COMMAND_REGISTER:
                tank_state.pump_state = bool(value)
            elif register_address == VALVE_COMMAND_REGISTER:
                tank_state.valve_state = bool(value)

        current_registers[address - start_address : address - start_address + len(values)] = list(values)
        return None

    if func_code == 4:
        live_values = _live_input_registers()
        read_start = address - start_address
        read_end = read_start + count
        current_registers[read_start:read_end] = live_values[read_start:read_end]

    return None


def create_datastore() -> SimDevice:
    """Create the live Modbus device model that reflects the current TankState."""
    return SimDevice(
        id=0,
        simdata=(
            [SimData(address=0, values=[False], datatype=DataType.BITS)],
            [SimData(address=0, values=[False], datatype=DataType.BITS)],
            [SimData(address=0, values=[0, 0], datatype=DataType.REGISTERS)],
            [SimData(address=0, values=_live_input_registers(), datatype=DataType.REGISTERS)],
        ),
        action=register_action,
    )


async def tick_loop() -> None:
    """Advance the live tank state on the configured interval for Increment 7."""
    try:
        while True:
            await asyncio.sleep(PlantConfig.tick_interval_seconds)
            tank_state.tick()
            logger.info(
                "tick -> water_level=%.1f pump=%s valve=%s",
                tank_state.water_level,
                tank_state.pump_state,
                tank_state.valve_state,
            )
    except asyncio.CancelledError:
        logger.info("Tank tick loop stopped.")
        raise


async def run_server_async(host: str | None = None, port: int | None = None):
    """
    Starts and runs the Modbus TCP server asynchronously.
    """
    host = host or PlantConfig.modbus_host
    port = port or PlantConfig.modbus_port

    context = create_datastore()
    tick_task = asyncio.create_task(tick_loop())
    logger.info(f"Starting SafeCheck Plant Modbus TCP server on {host}:{port}...")
    try:
        await StartAsyncTcpServer(
            context=context,
            address=(host, port),
        )
    finally:
        tick_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await tick_task


def run_server(host: str | None = None, port: int | None = None):
    """
    Synchronous entry point to run the Modbus TCP server event loop.
    """
    asyncio.run(run_server_async(host, port))


if __name__ == "__main__":
    run_server()
