"""Synchronous Modbus helper used by all scripted attack demonstrations."""
from __future__ import annotations

import logging

from pymodbus.client import ModbusTcpClient

from common.config import PUMP_COMMAND_REGISTER, VALVE_COMMAND_REGISTER, WATER_LEVEL_REGISTER


class PlantClient:
    def __init__(self, host: str, port: int, source_port: int, logger: logging.Logger):
        self.host, self.port, self.source_port, self.logger = host, port, source_port, logger
        self.client = ModbusTcpClient(host, port=port, source_address=("", source_port), timeout=3, retries=0)

    def connect(self) -> None:
        if not self.client.connect():
            raise ConnectionError(f"could not connect to Plant at {self.host}:{self.port}")
        self.logger.info("CONNECTED | plant=%s:%s source_port=%s", self.host, self.port, self.source_port)

    def close(self) -> None:
        self.client.close()

    def read_state(self) -> tuple[float, bool, bool]:
        response = self.client.read_input_registers(address=WATER_LEVEL_REGISTER, count=3)
        if response.isError() or len(response.registers) < 3:
            raise ConnectionError(f"input-register read failed: {response}")
        return float(response.registers[0]), bool(response.registers[1]), bool(response.registers[2])

    def write_pump(self, value: bool) -> None:
        self._write(PUMP_COMMAND_REGISTER, value, "pump")

    def write_valve(self, value: bool) -> None:
        self._write(VALVE_COMMAND_REGISTER, value, "valve")

    def _write(self, register: int, value: bool, name: str) -> None:
        response = self.client.write_register(address=register, value=int(value))
        if response.isError():
            raise ConnectionError(f"{name} write failed: {response}")
        self.logger.info("ACTION | register=%s(%s) value=%s", register, name, int(value))
