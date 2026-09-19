"""Passive Modbus TCP command sensor backed by Scapy packet capture."""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.detector.engine import evaluate_command, evaluate_malformed_packet
from app.database import engine
from app.models.command import CommandType
from app.models.reading import Reading
from app.schemas.command import CommandIn
from app.services.modbus_client import read_plant_state
from app.services.modbus_parser import parse_modbus_tcp_frame
from sqlmodel import Session, select

logger = logging.getLogger(__name__)


class PacketSniffer:
    """Capture requests to the Plant and schedule detector work on FastAPI's loop.

    Scapy calls ``prn`` from its capture thread.  It must never write SQLite or
    call async Modbus APIs directly, so it forwards a compact event to the
    application loop with ``run_coroutine_threadsafe``.
    """

    def __init__(self, event_loop: asyncio.AbstractEventLoop, plant_host: str, plant_port: int, interface: str | None):
        self.event_loop = event_loop
        self.plant_host = plant_host
        self.plant_port = plant_port
        self.interface = interface
        self._sniffer: Any | None = None
        self.running = False

    def start(self) -> bool:
        try:
            from scapy.all import AsyncSniffer

            self._sniffer = AsyncSniffer(
                iface=self.interface,
                filter=f"tcp dst port {self.plant_port}",
                prn=self._handle_packet,
                store=False,
            )
            self._sniffer.start()
            self.running = True
            logger.info("Passive Modbus sniffer started on interface=%s port=%s", self.interface, self.plant_port)
            return True
        except Exception as exc:  # permissions/interface/libpcap failures must not stop the backend
            self.running = False
            logger.warning("Passive sniffer unavailable; holding-register diff fallback remains active: %s", exc)
            return False

    def stop(self) -> None:
        if self._sniffer is not None:
            try:
                self._sniffer.stop()
            except Exception as exc:
                logger.debug("Error while stopping packet sniffer: %s", exc)
        self.running = False

    def _handle_packet(self, packet: Any) -> None:
        try:
            from scapy.all import IP, Raw, TCP

            if not packet.haslayer(IP) or not packet.haslayer(TCP) or not packet.haslayer(Raw):
                return
            tcp = packet[TCP]
            if int(tcp.dport) != self.plant_port:
                return
            raw = bytes(packet[Raw].load)
            source = f"{packet[IP].src}:{tcp.sport}"
            future = asyncio.run_coroutine_threadsafe(self._process_payload(raw, source), self.event_loop)
            future.add_done_callback(self._log_dispatch_error)
        except Exception:
            logger.exception("Packet-sniffer callback failed")

    @staticmethod
    def _log_dispatch_error(future: Any) -> None:
        try:
            future.result()
        except Exception:
            logger.exception("Packet-sniffer detector dispatch failed")

    async def _process_payload(self, raw: bytes, source: str) -> None:
        result = parse_modbus_tcp_frame(raw)
        if result.is_malformed:
            alert = evaluate_malformed_packet(raw, source, result.malformed_reason or "unknown parsing failure")
            logger.warning("Malformed Modbus packet detected: %s", alert["message"])
            return
        if not result.writes:
            return

        current_state = await self._current_plant_state()
        for write in result.writes:
            command = CommandIn(
                command_type=CommandType(write.command_type), value=write.value, source_id=source
            )
            _, alert = evaluate_command(command, current_plant_state=current_state)
            if alert:
                logger.warning("Packet-sourced command alert: %s", alert["message"])

    async def _current_plant_state(self) -> dict | None:
        try:
            water, pump, valve = await read_plant_state(self.plant_host, self.plant_port, timeout=1.0)
            return {"water_level": float(water), "pump_state": bool(pump), "valve_state": bool(valve)}
        except Exception as exc:
            logger.warning("Could not obtain live state for packet command: %s", exc)
        try:
            with Session(engine) as session:
                reading = session.exec(select(Reading).order_by(Reading.timestamp.desc()).limit(1)).first()
                if reading is not None:
                    return {
                        "water_level": float(reading.water_level),
                        "pump_state": bool(reading.pump_state),
                        "valve_state": bool(reading.valve_state),
                    }
        except Exception:
            logger.exception("Could not load the latest persisted plant state for packet command")
        return None


_active_sniffer: PacketSniffer | None = None


def start_sniffer(event_loop: asyncio.AbstractEventLoop, plant_host: str, plant_port: int, interface: str | None) -> PacketSniffer:
    global _active_sniffer
    _active_sniffer = PacketSniffer(event_loop, plant_host, plant_port, interface)
    _active_sniffer.start()
    return _active_sniffer


def stop_sniffer() -> None:
    global _active_sniffer
    if _active_sniffer is not None:
        _active_sniffer.stop()
    _active_sniffer = None


def sniffer_is_running() -> bool:
    return bool(_active_sniffer and _active_sniffer.running)
