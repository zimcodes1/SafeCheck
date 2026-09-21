"""Minimal Modbus TCP MITM proxy that replays captured input-register replies."""
from __future__ import annotations

import socket
import socketserver
import threading


def _receive_exact(connection: socket.socket, count: int) -> bytes:
    chunks: list[bytes] = []
    while count:
        chunk = connection.recv(count)
        if not chunk:
            raise ConnectionError("peer closed connection")
        chunks.append(chunk)
        count -= len(chunk)
    return b"".join(chunks)


def receive_adu(connection: socket.socket) -> bytes:
    header = _receive_exact(connection, 6)
    length = int.from_bytes(header[4:6], "big")
    return header + _receive_exact(connection, length)


class ReplayProxy:
    def __init__(self, listen_host: str, listen_port: int, plant_host: str, plant_port: int):
        self.listen_host, self.listen_port = listen_host, listen_port
        self.plant_host, self.plant_port = plant_host, plant_port
        self._cached_input_response: bytes | None = None
        self._cache_lock = threading.Lock()
        self.snapshot_ready = threading.Event()
        parent = self

        class Handler(socketserver.BaseRequestHandler):
            def handle(self) -> None:
                try:
                    with socket.create_connection((parent.plant_host, parent.plant_port), timeout=3) as upstream:
                        while True:
                            request = receive_adu(self.request)
                            upstream.sendall(request)
                            live_response = receive_adu(upstream)
                            function_code = request[7] if len(request) > 7 else None
                            if function_code == 0x04:
                                with parent._cache_lock:
                                    if parent._cached_input_response is None:
                                        parent._cached_input_response = live_response
                                        parent.snapshot_ready.set()
                                    response = request[0:2] + parent._cached_input_response[2:]
                            else:
                                response = live_response
                            self.request.sendall(response)
                except (ConnectionError, OSError):
                    return

        class Server(socketserver.ThreadingTCPServer):
            allow_reuse_address = True
            daemon_threads = True

        self.server = Server((listen_host, listen_port), Handler)

    def serve_forever(self) -> None:
        self.server.serve_forever()

    def start(self) -> None:
        threading.Thread(target=self.serve_forever, name="safecheck-replay-proxy", daemon=True).start()

    def close(self) -> None:
        self.server.server_close()
