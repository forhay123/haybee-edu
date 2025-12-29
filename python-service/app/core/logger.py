import logging
import sys
from typing import Optional


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Returns a configured logger instance with consistent formatting.
    Works seamlessly inside Docker and with Uvicorn.
    """
    logger = logging.getLogger(name or "app")

    # Avoid re-adding handlers if logger already configured
    if logger.handlers:
        return logger

    # Console handler for stdout
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )

    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    return logger
