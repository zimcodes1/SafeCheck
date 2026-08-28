"""Entry point for the SafeCheck plant server."""

from server.modbus_server import run_server


if __name__ == "__main__":
    run_server()
