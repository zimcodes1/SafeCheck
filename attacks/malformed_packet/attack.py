"""Send deliberately malformed Modbus TCP bytes to exercise SafeCheck Layer 1.

This does not use pymodbus because the payloads are intentionally not valid
Modbus requests. Run it only against the local SafeCheck Plant or an explicitly
authorised test target.
"""
from __future__ import annotations

import argparse
import socket


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
    with socket.create_connection((args.host, args.port), timeout=3) as connection:
        connection.sendall(payload)
    print(f"sent {args.case} payload: {payload.hex(' ')}")


if __name__ == "__main__":
    main()
