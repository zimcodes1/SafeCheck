import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.services.modbus_parser import parse_modbus_tcp_frame


def test_write_single_reconstructs_pump_command():
    # transaction=1, protocol=0, length=6, unit=1, FC=6, register=0, value=1
    result = parse_modbus_tcp_frame(bytes.fromhex("000100000006010600000001"))
    assert not result.is_malformed
    assert [(write.command_type, write.value) for write in result.writes] == [("pump", True)]


def test_write_multiple_reconstructs_both_commands():
    # Start at register 0 and write pump=1, valve=0.
    result = parse_modbus_tcp_frame(bytes.fromhex("00010000000b0110000000020400010000"))
    assert not result.is_malformed
    assert [(write.command_type, write.value) for write in result.writes] == [("pump", True), ("valve", False)]


def test_rejects_bad_protocol_and_keeps_raw_bytes():
    raw = bytes.fromhex("000100010006010600000001")
    result = parse_modbus_tcp_frame(raw)
    assert result.is_malformed
    assert "protocol" in result.malformed_reason
    assert result.raw == raw


def test_rejects_truncated_and_invalid_register_writes():
    truncated = parse_modbus_tcp_frame(bytes.fromhex("00010000000601060000"))
    invalid_register = parse_modbus_tcp_frame(bytes.fromhex("000100000006010600020001"))
    assert truncated.is_malformed and "truncated" in truncated.malformed_reason
    assert invalid_register.is_malformed and "unsupported" in invalid_register.malformed_reason


if __name__ == "__main__":
    test_write_single_reconstructs_pump_command()
    test_write_multiple_reconstructs_both_commands()
    test_rejects_bad_protocol_and_keeps_raw_bytes()
    test_rejects_truncated_and_invalid_register_writes()
    print("test_modbus_parser: ok")
