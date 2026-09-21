"""Small, strict parser for one Modbus TCP request ADU.

The live sniffer deliberately treats one TCP payload as one Modbus ADU.  TCP
stream reassembly is outside this project's demo scope, so a split or combined
frame is surfaced as malformed instead of being silently misinterpreted.
"""
from __future__ import annotations

from dataclasses import dataclass

PUMP_REGISTER = 0
VALVE_REGISTER = 1
READ_HOLDING = 0x03
READ_INPUT = 0x04
WRITE_SINGLE = 0x06
WRITE_MULTIPLE = 0x10
SUPPORTED_FUNCTIONS = {READ_HOLDING, READ_INPUT, WRITE_SINGLE, WRITE_MULTIPLE}
REGISTER_TYPES = {PUMP_REGISTER: "pump", VALVE_REGISTER: "valve"}


@dataclass(frozen=True)
class ModbusWrite:
    command_type: str
    value: bool


@dataclass(frozen=True)
class ParseResult:
    raw: bytes
    malformed_reason: str | None = None
    transaction_id: int | None = None
    unit_id: int | None = None
    function_code: int | None = None
    writes: tuple[ModbusWrite, ...] = ()

    @property
    def is_malformed(self) -> bool:
        return self.malformed_reason is not None


def _bad(raw: bytes, reason: str) -> ParseResult:
    return ParseResult(raw=raw, malformed_reason=reason)


def parse_modbus_tcp_frame(raw: bytes) -> ParseResult:
    """Validate a Modbus TCP request and reconstruct any command writes."""
    if len(raw) < 7:
        return _bad(raw, "truncated MBAP header")
    transaction_id = int.from_bytes(raw[0:2], "big")
    protocol_id = int.from_bytes(raw[2:4], "big")
    length = int.from_bytes(raw[4:6], "big")
    if protocol_id != 0:
        return _bad(raw, f"invalid protocol ID 0x{protocol_id:04x}")
    if length < 2:
        return _bad(raw, f"invalid MBAP length {length}; a request needs unit ID and function code")
    expected_size = 6 + length
    if len(raw) < expected_size:
        return _bad(raw, f"truncated frame: header declares {expected_size} bytes, captured {len(raw)}")
    if len(raw) != expected_size:
        return _bad(raw, f"length mismatch: header declares {expected_size} bytes, captured {len(raw)}")

    unit_id, function_code = raw[6], raw[7]
    result = ParseResult(raw=raw, transaction_id=transaction_id, unit_id=unit_id, function_code=function_code)
    if function_code not in SUPPORTED_FUNCTIONS:
        return _bad(raw, f"unexpected function code 0x{function_code:02x}")
    data = raw[8:]
    if function_code in (READ_HOLDING, READ_INPUT):
        if len(data) != 4 or int.from_bytes(data[2:4], "big") == 0:
            return _bad(raw, "read request has an invalid data length or quantity")
        return result
    if function_code == WRITE_SINGLE:
        if len(data) != 4:
            return _bad(raw, "write-single request has an invalid data length")
        address = int.from_bytes(data[0:2], "big")
        value = int.from_bytes(data[2:4], "big")
        return _writes_result(raw, transaction_id, unit_id, function_code, [(address, value)])

    # Function 16: start address, quantity, byte-count, then 16-bit values.
    if len(data) < 5:
        return _bad(raw, "truncated write-multiple request")
    address = int.from_bytes(data[0:2], "big")
    quantity = int.from_bytes(data[2:4], "big")
    byte_count = data[4]
    if quantity == 0 or byte_count != quantity * 2 or len(data) != 5 + byte_count:
        return _bad(raw, "write-multiple quantity or byte count does not match payload")
    pairs = [(address + index, int.from_bytes(data[5 + index * 2:7 + index * 2], "big")) for index in range(quantity)]
    return _writes_result(raw, transaction_id, unit_id, function_code, pairs)


def _writes_result(raw: bytes, transaction_id: int, unit_id: int, function_code: int, pairs: list[tuple[int, int]]) -> ParseResult:
    writes: list[ModbusWrite] = []
    for address, value in pairs:
        if address not in REGISTER_TYPES:
            return _bad(raw, f"write targets unsupported holding register {address}")
        if value not in (0, 1):
            return _bad(raw, f"write to register {address} has invalid value {value}")
        writes.append(ModbusWrite(REGISTER_TYPES[address], bool(value)))
    return ParseResult(raw=raw, transaction_id=transaction_id, unit_id=unit_id, function_code=function_code, writes=tuple(writes))
