"""Careful, Modbus-only operator cycle for the SafeCheck water Plant."""
from __future__ import annotations

import logging
import random
import time
from logging.handlers import RotatingFileHandler

from pymodbus.client import ModbusTcpClient

from legitimate_client.config import (
    PUMP_COMMAND_REGISTER,
    VALVE_COMMAND_REGISTER,
    WATER_LEVEL_REGISTER,
    OperatorSettings,
)


def setup_logging() -> logging.Logger:
    logger = logging.getLogger("safecheck.legitimate_client")
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    for handler in (logging.StreamHandler(), RotatingFileHandler("legit_client.log", maxBytes=1_000_000, backupCount=3)):
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger


class LegitimateOperator:
    def __init__(self, settings: OperatorSettings, logger: logging.Logger | None = None):
        self.settings = settings
        self.logger = logger or setup_logging()
        self.client: ModbusTcpClient | None = None

    def connect_forever(self) -> None:
        attempt = 0
        while self.client is None or not self.client.connected:
            self.close()
            try:
                # pymodbus creates its TCP socket from this explicit source
                # address; this is equivalent to binding before connect.
                candidate = ModbusTcpClient(
                    self.settings.plant_host,
                    port=self.settings.plant_port,
                    source_address=("", self.settings.local_source_port),
                    timeout=3,
                    retries=0,
                )
                if candidate.connect():
                    self.client = candidate
                    self.logger.info("CONNECTED | plant=%s:%s source_port=%s", self.settings.plant_host, self.settings.plant_port, self.settings.local_source_port)
                    return
                candidate.close()
                reason = "Modbus TCP connection was refused"
            except Exception as exc:
                reason = str(exc)
            delay = self.settings.reconnect_backoff_seconds[min(attempt, len(self.settings.reconnect_backoff_seconds) - 1)]
            self.logger.warning("CONNECT_RETRY | reason=%s retry_in=%ss", reason, delay)
            attempt += 1
            time.sleep(delay)

    def close(self) -> None:
        if self.client is not None:
            try:
                self.client.close()
            finally:
                self.client = None

    def _require_client(self) -> ModbusTcpClient:
        if self.client is None or not self.client.connected:
            raise ConnectionError("Plant connection is not available")
        return self.client

    def water_level(self) -> float:
        response = self._require_client().read_input_registers(address=WATER_LEVEL_REGISTER, count=1)
        if response.isError() or not response.registers:
            raise ConnectionError(f"water-level read failed: {response}")
        return float(response.registers[0])

    def write(self, register: int, value: int, label: str) -> None:
        response = self._require_client().write_register(address=register, value=value)
        if response.isError():
            raise ConnectionError(f"write to register {register} failed: {response}")
        try:
            level = self.water_level()
            level_text = f" water_level={level:.1f}"
        except Exception:
            level_text = " water_level=unavailable"
        self.logger.info("ACTION | %s register=%s value=%s%s", label, register, value, level_text)

    def guard_before_fill(self) -> None:
        waited = 0.0
        while True:
            level = self.water_level()
            if level <= self.settings.safe_to_fill_level:
                return
            self.write(VALVE_COMMAND_REGISTER, 1, "extended_drain_open_valve")
            self.logger.info("GUARD_WAIT | water_level=%.1f threshold=%.1f", level, self.settings.safe_to_fill_level)
            if waited >= self.settings.max_guard_wait_seconds:
                # The valve remains open, so proceeding cannot create the
                # pump-on/closed-valve danger condition this guard prevents.
                self.logger.warning("GUARD_TIMEOUT | water level still above threshold after %.0fs; proceeding with valve open", waited)
                return
            time.sleep(self.settings.level_check_interval)
            waited += self.settings.level_check_interval

    def run(self, max_cycles: int | None = None) -> None:
        completed = 0
        while max_cycles is None or completed < max_cycles:
            try:
                self.connect_forever()
                self.guard_before_fill()
                self.write(PUMP_COMMAND_REGISTER, 1, "begin_fill")
                time.sleep(random.uniform(*self.settings.fill_duration_range))
                self.write(PUMP_COMMAND_REGISTER, 0, "end_fill")
                time.sleep(random.uniform(*self.settings.phase_pause_range))
                self.write(VALVE_COMMAND_REGISTER, 1, "begin_drain")
                time.sleep(random.uniform(*self.settings.drain_duration_range))
                self.write(VALVE_COMMAND_REGISTER, 0, "end_drain")
                time.sleep(random.uniform(*self.settings.phase_pause_range))
                completed += 1
                self.logger.info("CYCLE_COMPLETE | cycle=%s", completed)
            except (ConnectionError, OSError, ValueError) as exc:
                self.logger.warning("CONNECTION_LOST | %s; reconnecting and restarting current cycle", exc)
                self.close()
