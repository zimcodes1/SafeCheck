"""Logger configuration for the SafeCheck plant server.

Each run creates a new log file named with a session timestamp, for example:
    logs/session_20260828_153045.log
"""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path


def build_log_path(log_dir: str | Path | None = None, session_id: str | None = None) -> Path:
    """Create a timestamped log file path.

    The output file is stored under the plant/logs directory by default. If a
    session_id is supplied, it is used as the prefix; otherwise a timestamp is
    generated automatically.
    """
    base_dir = Path(log_dir) if log_dir is not None else Path(__file__).resolve().parent.parent / "logs"
    base_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name = session_id or f"session_{stamp}"
    return base_dir / f"{name}.log"


def setup_logger(
    name: str = "safecheck",
    log_dir: str | Path | None = None,
    session_id: str | None = None,
    level: int = logging.INFO,
) -> logging.Logger:
    """Create and return a logger configured for file output."""
    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.propagate = False

    for handler in list(logger.handlers):
        logger.removeHandler(handler)
        handler.close()

    log_path = build_log_path(log_dir=log_dir, session_id=session_id)
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
