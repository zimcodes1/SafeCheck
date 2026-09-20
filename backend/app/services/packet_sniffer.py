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

import os
import time

logger = logging.getLogger(__name__)

MIRROR_PORT = int(os.getenv("PACKET_MIRROR_PORT", "5029"))


class MirrorProtocol(asyncio.DatagramProtocol):
    def __init__(self, owner: PacketSniffer):
        self.owner = owner

    def datagram_received(self, data: bytes, addr: tuple[str, int]) -> None:
        if b"\n" in data:
            source_bytes, raw = data.split(b"\n", 1)
            source = source_bytes.decode(errors="replace")
            asyncio.run_coroutine_threadsafe(
                self.owner._process_payload(raw, source), self.owner.event_loop
            )


class PacketSniffer:
    """Capture requests to the Plant and schedule detector work on FastAPI's loop.

    Supports both raw packet capture via Scapy (if root/CAP_NET_RAW is available)
    and user-space packet mirror tap via UDP loopback (runs without root/sudo).
    """

    def __init__(self, event_loop: asyncio.AbstractEventLoop, plant_host: str, plant_port: int, interface: str | None):
        self.event_loop = event_loop
        self.plant_host = plant_host
        self.plant_port = plant_port
        self.interface = interface
        self.mirror_port = MIRROR_PORT
        self._sniffer: Any | None = None
        self._mirror_transport: Any | None = None
        self._recent_packets: dict[tuple[str, bytes], float] = {}
        self.running = False

    def start(self) -> bool:
        # 1. Start user-space packet mirror tap listener (runs without root / sudo)
        async def _start_mirror():
            try:
                self._mirror_transport, _ = await self.event_loop.create_datagram_endpoint(
                    lambda: MirrorProtocol(self),
                    local_addr=("127.0.0.1", self.mirror_port),
                )
                self.running = True
                logger.info("Passive packet mirror tap listener active on 127.0.0.1:%s", self.mirror_port)
            except Exception as exc:
                logger.warning("Could not start packet mirror tap on port %s: %s", self.mirror_port, exc)

        try:
            if self.event_loop.is_running():
                self.event_loop.create_task(_start_mirror())
            else:
                self.event_loop.run_until_complete(_start_mirror())
        except Exception as exc:
            logger.warning("Could not schedule packet mirror tap on port %s: %s", self.mirror_port, exc)

        # 2. Attempt raw Scapy capture (requires CAP_NET_RAW / sudo on Linux)
        try:
            from scapy.all import AsyncSniffer

            sniffer = AsyncSniffer(
                iface=self.interface,
                filter=f"tcp dst port {self.plant_port}",
                prn=self._handle_packet,
                store=False,
            )
            sniffer.start()
            time.sleep(0.05)
            if getattr(sniffer, "exception", None) is not None:
                raise sniffer.exception
            self._sniffer = sniffer
            self.running = True
            logger.info("Raw Scapy sniffer active on interface=%s port=%s", self.interface, self.plant_port)
        except Exception as exc:
            logger.info(
                "Raw Scapy sniffer unavailable without root/CAP_NET_RAW (%s); user-space mirror tap is active.",
                exc,
            )

        return self.running

    def stop(self) -> None:
        if self._sniffer is not None:
            try:
                self._sniffer.stop()
            except Exception as exc:
                logger.debug("Error while stopping packet sniffer: %s", exc)
            self._sniffer = None
        if self._mirror_transport is not None:
            try:
                self._mirror_transport.close()
            except Exception as exc:
                logger.debug("Error while stopping mirror transport: %s", exc)
            self._mirror_transport = None
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
        now = time.time()
        key = (source, raw)
        if key in self._recent_packets and (now - self._recent_packets[key]) < 0.2:
            return
        self._recent_packets[key] = now
        if len(self._recent_packets) > 200:
            self._recent_packets = {k: v for k, v in self._recent_packets.items() if now - v < 1.0}

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
