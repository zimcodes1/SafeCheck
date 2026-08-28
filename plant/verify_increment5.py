"""
Verification script for Plant Increment 5.
Starts the Modbus server in an asyncio background task and validates that
holding-register writes update the live TankState and that input-register reads
reflect the current state without any physics tick yet.
"""

import asyncio
import sys

from pymodbus.client import AsyncModbusTcpClient
from pymodbus.server import ServerAsyncStop

from server.registers import (
    PUMP_COMMAND_REGISTER,
    VALVE_COMMAND_REGISTER,
    WATER_LEVEL_REGISTER,
    PUMP_STATUS_REGISTER,
    VALVE_STATUS_REGISTER,
)
from server.modbus_server import run_server_async


async def test_modbus_server_increment5():
    """Validate that command writes update live state and input reads reflect it."""
    host = "127.0.0.1"
    port = 5020

    server_task = asyncio.create_task(run_server_async(host=host, port=port))
    await asyncio.sleep(0.5)

    if server_task.done():
        exc = server_task.exception()
        print(f"[TEST ERROR] Server task exited before client connection: {exc!r}")
        return False

    client = AsyncModbusTcpClient(host=host, port=port)
    connected = await client.connect()
    if not connected:
        print("[TEST ERROR] Could not connect to Modbus TCP server.")
        server_task.cancel()
        return False

    try:
        initial_hr = await client.read_holding_registers(
            address=PUMP_COMMAND_REGISTER, count=2
        )
        if initial_hr.isError():
            print(f"[TEST ERROR] Failed to read holding registers: {initial_hr}")
            return False
        assert initial_hr.registers == [0, 0], initial_hr.registers

        write_resp = await client.write_registers(
            address=PUMP_COMMAND_REGISTER,
            values=[1, 1],
        )
        if write_resp.isError():
            print(f"[TEST ERROR] Failed to write holding registers: {write_resp}")
            return False

        updated_hr = await client.read_holding_registers(
            address=PUMP_COMMAND_REGISTER, count=2
        )
        if updated_hr.isError():
            print(f"[TEST ERROR] Failed to read updated holding registers: {updated_hr}")
            return False
        assert updated_hr.registers == [1, 1], updated_hr.registers

        input_resp = await client.read_input_registers(
            address=WATER_LEVEL_REGISTER, count=3
        )
        if input_resp.isError():
            print(f"[TEST ERROR] Failed to read input registers: {input_resp}")
            return False

        assert input_resp.registers == [50, 1, 1], input_resp.registers

        print("[TEST] Holding registers after write: [1, 1]")
        print("[TEST] Input registers after write: [50, 1, 1]")
        print("[TEST SUCCESS] Increment 5 verification passed")
        return True

    finally:
        client.close()
        server_task.cancel()
        try:
            await ServerAsyncStop()
        except Exception:
            pass


def main():
    success = asyncio.run(test_modbus_server_increment5())
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
