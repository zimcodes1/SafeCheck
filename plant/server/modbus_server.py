"""
Modbus TCP Server Skeleton for SafeCheck Plant (Increment 4).
Initializes Modbus datastore with static placeholder values and serves Modbus TCP.
"""

import asyncio
import logging
import warnings

# Filter pymodbus v4 transition deprecation warning for datastore context
warnings.filterwarnings("ignore", category=DeprecationWarning, module="pymodbus")

from pymodbus.datastore import (
        ModbusSequentialDataBlock,
        ModbusServerContext,
        ModbusDeviceContext,
    )
from pymodbus.server import StartAsyncTcpServer
from server.config import PlantConfig
from server.registers import (
        PUMP_COMMAND_REGISTER,
        VALVE_COMMAND_REGISTER,
        WATER_LEVEL_REGISTER,
        PUMP_STATUS_REGISTER,
        VALVE_STATUS_REGISTER,
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logging.getLogger("pymodbus").setLevel(logging.ERROR)
logger = logging.getLogger("plant.server")


def create_datastore() -> ModbusServerContext:
    """
    Creates and initializes the Modbus datastore with static placeholder values (Increment 4).

    Holding Registers (commands):
      - Register 0 (PUMP_COMMAND_REGISTER): 0 (pump off)
      - Register 1 (VALVE_COMMAND_REGISTER): 0 (valve closed)

    Input Registers (sensor readings):
      - Register 0 (WATER_LEVEL_REGISTER): 50 (static 50% water level placeholder)
      - Register 1 (PUMP_STATUS_REGISTER): 0 (pump stopped)
      - Register 2 (VALVE_STATUS_REGISTER): 0 (valve closed)
    """
    # Initialize holding registers (size 2: pump command = 0, valve command = 0)
    # Sequential datablock address 1 maps to protocol register offset 0
    holding_block = ModbusSequentialDataBlock(1, [0, 0])

    # Initialize input registers (size 3: water level = 50, pump status = 0, valve status = 0)
    input_block = ModbusSequentialDataBlock(1, [50, 0, 0])

    # Build device context with holding and input registers
    device_context = ModbusDeviceContext(
        di=None,
        co=None,
        hr=holding_block,
        ir=input_block,
    )

    # Wrap in server context; single=True routes all unit IDs to this context
    return ModbusServerContext(devices=device_context, single=True)


async def run_server_async(host: str | None = None, port: int | None = None):
    """
    Starts and runs the Modbus TCP server asynchronously.
    """
    host = host or PlantConfig.modbus_host
    port = port or PlantConfig.modbus_port

    context = create_datastore()
    logger.info(f"Starting SafeCheck Plant Modbus TCP server on {host}:{port}...")
    await StartAsyncTcpServer(
        context=context,
        address=(host, port),
    )


def run_server(host: str | None = None, port: int | None = None):
    """
    Synchronous entry point to run the Modbus TCP server event loop.
    """
    asyncio.run(run_server_async(host, port))


if __name__ == "__main__":
    run_server()
