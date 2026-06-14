import logging
import sys
from logging.handlers import RotatingFileHandler


def setup_logger():
    logger = logging.getLogger("medviz")
    logger.setLevel(logging.INFO)

    if logger.handlers:
        return logger

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )

    # Console logs
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)

    # File logs
    file_handler = RotatingFileHandler(
        "medviz.log",
        maxBytes=5_000_000,
        backupCount=3,
    )
    file_handler.setFormatter(formatter)

    logger.addHandler(console)
    logger.addHandler(file_handler)

    return logger


logger = setup_logger()
