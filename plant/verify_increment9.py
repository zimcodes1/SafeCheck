"""Verification for Increment 9: the plant entry point starts the server and accepts a client."""

import os
import socket
import subprocess
import sys
import time


def wait_for_port(host: str, port: int, timeout: float = 10.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.5)
            try:
                sock.connect((host, port))
                return True
            except OSError:
                time.sleep(0.2)
    return False


def main() -> int:
    proc = subprocess.Popen(
        [sys.executable, "run.py"],
        cwd=os.path.dirname(__file__),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        if not wait_for_port("127.0.0.1", 5020, timeout=10.0):
            print("[TEST ERROR] Plant entry point did not start a Modbus server on port 5020")
            return 1

        print("[TEST SUCCESS] Increment 9 run entry point started successfully")
        return 0
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()


if __name__ == "__main__":
    raise SystemExit(main())
