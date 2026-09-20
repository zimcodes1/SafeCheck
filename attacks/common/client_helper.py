"""Synchronous Modbus helper used by all scripted attack demonstrations."""
from __future__ import annotations

import logging
import socket
import struct

from pymodbus.client import ModbusTcpClient

from common.config import PUMP_COMMAND_REGISTER, VALVE_COMMAND_REGISTER, WATER_LEVEL_REGISTER


class ReusableModbusTcpClient(ModbusTcpClient):
    """ModbusTcpClient with SO_REUSEADDR and SO_LINGER=0.

    Eliminates Linux kernel TIME_WAIT socket lockouts on fixed source ports (e.g. 6002-6007),
    allowing attack scripts to be run consecutively without waiting for port release timeouts.
    """

    def connect(self) -> bool:
        if self.socket:
            return True
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            if hasattr(socket, "SO_REUSEPORT"):
                try:
                    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
                except OSError:
                    pass
            # Reset immediately on close so the port is freed instantly
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER, struct.pack("ii", 1, 0))
            if self.comm_params.source_address:
                sock.bind(self.comm_params.source_address)
            sock.settimeout(self.comm_params.timeout_connect)
            sock.connect((self.comm_params.host, self.comm_params.port))
            self.socket = sock
            return True
        except OSError:
            self.close()
            return False


class PlantClient:
    def __init__(self, host: str, port: int, source_port: int, logger: logging.Logger):
        self.host, self.port, self.source_port, self.logger = host, port, source_port, logger
        self.client = ReusableModbusTcpClient(host, port=port, source_address=("", source_port), timeout=3, retries=0)

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
