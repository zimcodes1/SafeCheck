"""Careful, Modbus-only operator cycle for the SafeCheck water Plant."""
from __future__ import annotations

import logging
import random
import socket
import struct
import time
from logging.handlers import RotatingFileHandler

from pymodbus.client import ModbusTcpClient

from legitimate_client.config import (
    PUMP_COMMAND_REGISTER,
    VALVE_COMMAND_REGISTER,
    WATER_LEVEL_REGISTER,
    OperatorSettings,
)


class ReusableModbusTcpClient(ModbusTcpClient):
    """ModbusTcpClient with SO_REUSEADDR and SO_LINGER=0 to prevent TIME_WAIT port lockouts."""

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
                candidate = ReusableModbusTcpClient(
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

    def _sleep_with_level_check(self, duration: float, stop_condition=None, interval: float = 1.0) -> None:
        """Sleep up to duration seconds, waking early if stop_condition(current_level) is True."""
        deadline = time.time() + duration
        while time.time() < deadline:
            if stop_condition:
                try:
                    if stop_condition(self.water_level()):
                        break
                except Exception:
                    pass
            sleep_time = min(interval, max(0.0, deadline - time.time()))
            time.sleep(sleep_time)

    def guard_before_fill(self) -> None:
        waited = 0.0
        while True:
            level = self.water_level()
            if level <= self.settings.safe_to_fill_level:
                # Target safe level reached: close drain valve before proceeding
                self.write(VALVE_COMMAND_REGISTER, 0, "guard_drain_close_valve")
                return
            self.write(VALVE_COMMAND_REGISTER, 1, "extended_drain_open_valve")
            self.logger.info("GUARD_WAIT | water_level=%.1f threshold=%.1f", level, self.settings.safe_to_fill_level)
            if waited >= self.settings.max_guard_wait_seconds:
                self.logger.warning(
                    "GUARD_TIMEOUT | water level still above threshold after %.0fs; closing valve to proceed safely",
                    waited,
                )
                self.write(VALVE_COMMAND_REGISTER, 0, "guard_drain_close_valve")
                return
            time.sleep(self.settings.level_check_interval)
            waited += self.settings.level_check_interval

    def run(self, max_cycles: int | None = None) -> None:
        completed = 0
        while max_cycles is None or completed < max_cycles:
            try:
                self.connect_forever()

                # 1. Pre-fill safety guard: ensure tank is drained to safe start level
                self.guard_before_fill()

                # Natural pause after draining before engaging the pump
                pause_before_fill = random.uniform(*self.settings.phase_pause_range)
                self.logger.info("PHASE_PAUSE | resting before refill duration=%.1fs", pause_before_fill)
                time.sleep(pause_before_fill)

                # Ensure valve is securely closed before starting the pump
                self.write(VALVE_COMMAND_REGISTER, 0, "pre_fill_secure_valve")

                # 2. Refill phase: energize pump until duration expires or high target reached
                self.write(PUMP_COMMAND_REGISTER, 1, "begin_fill")
                fill_duration = random.uniform(*self.settings.fill_duration_range)
                self._sleep_with_level_check(
                    fill_duration,
                    stop_condition=lambda lvl: lvl >= self.settings.target_high_level,
                    interval=self.settings.level_check_interval,
                )
                self.write(PUMP_COMMAND_REGISTER, 0, "end_fill")

                # Natural pause at high level before opening the drain valve
                pause_before_drain = random.uniform(*self.settings.phase_pause_range)
                self.logger.info("PHASE_PAUSE | resting at high level before drain duration=%.1fs", pause_before_drain)
                time.sleep(pause_before_drain)

                # 3. Drain phase: open valve until duration expires or safe low level reached
                self.write(VALVE_COMMAND_REGISTER, 1, "begin_drain")
                drain_duration = random.uniform(*self.settings.drain_duration_range)
                self._sleep_with_level_check(
                    drain_duration,
                    stop_condition=lambda lvl: lvl <= self.settings.safe_to_fill_level,
                    interval=self.settings.level_check_interval,
                )
                self.write(VALVE_COMMAND_REGISTER, 0, "end_drain")

                # Natural pause after cycle completes before next cycle
                pause_after_cycle = random.uniform(*self.settings.phase_pause_range)
                self.logger.info("PHASE_PAUSE | post-cycle settling duration=%.1fs", pause_after_cycle)
                time.sleep(pause_after_cycle)

                completed += 1
                self.logger.info("CYCLE_COMPLETE | cycle=%s", completed)
            except (ConnectionError, OSError, ValueError) as exc:
                self.logger.warning("CONNECTION_LOST | %s; reconnecting and restarting current cycle", exc)
                self.close()
