"""Centralized logging for the SafeCheck backend.

Creates a per-session log file in `backend/logs/` and provides a
FastAPI/Starlette middleware class to log incoming requests with
descriptive types for successes and failures.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import Request
from starlette.types import ASGIApp
from starlette.middleware.base import BaseHTTPMiddleware


def _build_log_path(log_dir: Optional[str | Path] = None, session_id: Optional[str] = None) -> Path:
    base_dir = Path(log_dir) if log_dir is not None else Path(__file__).resolve().parent.parent / "logs"
    base_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name = session_id or f"session_{stamp}"
    return base_dir / f"{name}.log"


def setup_logger(name: str = "safecheck.backend", log_dir: Optional[str | Path] = None, session_id: Optional[str] = None, level: int = logging.INFO) -> logging.Logger:
    """Create and return a logger that writes to a per-session file and stdout.

    Log format mirrors the Plant logger but messages include more descriptive
    markers for request outcomes (e.g. REQUEST_SUCCESS / REQUEST_ERROR).
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.propagate = False

    # Clean up existing handlers to avoid duplicate logs when reloading
    for h in list(logger.handlers):
        logger.removeHandler(h)
        h.close()

    log_path = _build_log_path(log_dir=log_dir, session_id=session_id)
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    file_handler = logging.FileHandler(log_path)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    return logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that logs incoming requests and their outcomes.

    Logs at INFO for successful responses and at ERROR for server-side
    exceptions. Messages include a short marker (`REQUEST_SUCCESS` or
    `REQUEST_ERROR`) making it easier to scan logs for relevant events.
    """

    def __init__(self, app: ASGIApp, logger: logging.Logger):
        super().__init__(app)
        self.logger = logger

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        try:
            response = await call_next(request)
            elapsed = (time.perf_counter() - start) * 1000.0
            self.logger.info(
                "REQUEST_SUCCESS | %s %s | status=%s | %.1fms",
                request.method,
                request.url.path,
                response.status_code,
                elapsed,
            )
            return response
        except Exception as exc:  # pragma: no cover - application errors
            elapsed = (time.perf_counter() - start) * 1000.0
            self.logger.exception(
                "REQUEST_ERROR | %s %s | error=%s | %.1fms",
                request.method,
                request.url.path,
                exc,
                elapsed,
            )
            raise
