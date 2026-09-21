"""Send deliberately malformed Modbus TCP bytes to exercise SafeCheck Layer 1.

This does not use pymodbus because the payloads are intentionally not valid
Modbus requests. Run it only against the local SafeCheck Plant or an explicitly
authorised test target.
"""
from __future__ import annotations

import argparse
import socket
import struct


PACKETS = {
    # MBAP protocol ID must be zero.
    "bad-protocol": bytes.fromhex("000100010006010600000001"),
    # Declares a 6-byte payload but deliberately stops after the address.
    "truncated": bytes.fromhex("00010000000601060000"),
    # Function code 0x45 is not part of SafeCheck's Modbus vocabulary.
    "bad-function": bytes.fromhex("0001000000020145"),
    # Valid write-single structure, but register 2 is not a command register.
    "bad-register": bytes.fromhex("000100000006010600020001"),
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=5020, type=int)
    parser.add_argument("--case", choices=PACKETS, default="bad-protocol")
    args = parser.parse_args()

    payload = PACKETS[args.case]
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as connection:
        connection.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        if hasattr(socket, "SO_REUSEPORT"):
            try:
                connection.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
            except OSError:
                pass
        connection.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER, struct.pack('ii', 1, 0))
        connection.settimeout(3)
        connection.bind(("", 6007))
        connection.connect((args.host, args.port))
        connection.sendall(payload)
    print(f"sent {args.case} payload: {payload.hex(' ')}")


if __name__ == "__main__":
    main()
