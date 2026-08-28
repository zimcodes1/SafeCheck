"""
Verification script for Plant Increment 4.
Starts the Modbus server in an asyncio background task and connects a test client
to verify holding registers and input registers return the expected placeholder values.
"""

import asyncio
import sys
from pymodbus.client import AsyncModbusTcpClient
from pymodbus.server import ServerAsyncStop
from server.config import PlantConfig
from server.registers import (
        PUMP_COMMAND_REGISTER,
        VALVE_COMMAND_REGISTER,
        WATER_LEVEL_REGISTER,
        PUMP_STATUS_REGISTER,
        VALVE_STATUS_REGISTER,
    )
from server.modbus_server import run_server_async


async def test_modbus_server():
    """Starts server in background and tests register reads with a client."""
    host = "127.0.0.1"
    port = 5020

    # Start the Modbus TCP server in background task
    try:
        server_task = asyncio.create_task(run_server_async(host=host, port=port))
        print(f"[TEST] Started background server task on {host}:{port}")
    except:
        print("[TEST ERROR] Failed to start Modbus TCP server.")
        return False
    
    # Wait briefly for the server to bind and start listening
    await asyncio.sleep(0.5)

    if server_task.done():
        exc = server_task.exception()
        print(f"[TEST ERROR] Server task exited before client connection: {exc!r}")
        return False

    print(f"[TEST] Connecting AsyncModbusTcpClient to {host}:{port}...")
    client = AsyncModbusTcpClient(host=host, port=port)
    connected = await client.connect()
    
    if not connected:
        print("[TEST ERROR] Could not connect to Modbus TCP server.")
        server_task.cancel()
        return False

    print("[TEST SUCCESS] Connected to Modbus server.")

    try:
        # 1. Read Holding Registers (PUMP_COMMAND = 0, VALVE_COMMAND = 1)
        hr_response = await client.read_holding_registers(
            address=PUMP_COMMAND_REGISTER, count=2
        )
        if hr_response.isError():
            print(f"[TEST ERROR] Failed to read holding registers: {hr_response}")
            return False

        holding_values = hr_response.registers
        print(f"[TEST] Holding Registers [0..1]: {holding_values} (Expected: [0, 0])")
        assert holding_values == [0, 0], f"Holding registers mismatch: {holding_values}"

        # 2. Read Input Registers (WATER_LEVEL = 0, PUMP_STATUS = 1, VALVE_STATUS = 2)
        ir_response = await client.read_input_registers(
            address=WATER_LEVEL_REGISTER, count=3
        )
        if ir_response.isError():
            print(f"[TEST ERROR] Failed to read input registers: {ir_response}")
            return False

        input_values = ir_response.registers
        print(f"[TEST] Input Registers [0..2]: {input_values} (Expected: [50, 0, 0])")
        assert input_values == [50, 0, 0], f"Input registers mismatch: {input_values}"

        print("\n==========================================")
        print(" INCREMENT 4 VERIFICATION PASSED SUCCESSFULLY ")
        print(" - Modbus TCP server listening on port 5020")
        print(" - Holding registers (commands) return [0, 0]")
        print(" - Input registers (readings) return [50, 0, 0]")
        print("==========================================\n")
        return True

    finally:
        client.close()
        server_task.cancel()
        try:
            await ServerAsyncStop()
        except Exception:
            pass


def main():
    success = asyncio.run(test_modbus_server())
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

