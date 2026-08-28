"""Verification script for Plant Increment 7.
Starts the Modbus server and confirms that water_level rises over time when the
pump command is active, without any more client commands after the initial write."""

import asyncio
import sys

from pymodbus.client import AsyncModbusTcpClient
from pymodbus.server import ServerAsyncStop

from server.registers import (
    PUMP_COMMAND_REGISTER,
    VALVE_COMMAND_REGISTER,
    WATER_LEVEL_REGISTER,
)
from server.modbus_server import run_server_async


async def test_increment7():
    host = "127.0.0.1"
    port = 5020

    server_task = asyncio.create_task(run_server_async(host=host, port=port))
    await asyncio.sleep(0.5)

    if server_task.done():
        exc = server_task.exception()
        print(f"[TEST ERROR] server exited before startup: {exc!r}")
        return False

    client = AsyncModbusTcpClient(host=host, port=port)
    connected = await client.connect()
    if not connected:
        print("[TEST ERROR] Could not connect to Modbus TCP server.")
        server_task.cancel()
        return False

    try:
        write_resp = await client.write_registers(address=PUMP_COMMAND_REGISTER, values=[1])
        if write_resp.isError():
            print(f"[TEST ERROR] Failed to set pump on: {write_resp}")
            return False

        await asyncio.sleep(3.2)

        read_resp = await client.read_input_registers(address=WATER_LEVEL_REGISTER, count=3)
        if read_resp.isError():
            print(f"[TEST ERROR] Failed to read input registers: {read_resp}")
            return False

        water_level = read_resp.registers[0]
        print(f"[TEST] Water level after pump-on ticks: {water_level}")
        assert water_level >= 52, f"Expected water level to rise above 50, got {water_level}"

        print("[TEST SUCCESS] Increment 7 verification passed")
        return True

    finally:
        client.close()
        server_task.cancel()
        try:
            await ServerAsyncStop()
        except Exception:
            pass


def main():
    success = asyncio.run(test_increment7())
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
