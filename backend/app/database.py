import os
import sqlite3

from app.logger import logger

DB_PATH = "medviz.db"
UPLOAD_DIR = "patients_data"


def init_db():
    """Initialize the database and create necessary directories."""
    logger.info("Initializing database and directories")

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS patient (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                age INTEGER NOT NULL,
                gender TEXT NOT NULL,
                lung_volume REAL,
                optimal_fvc REAL,
                mean_hu REAL,
                std_hu REAL,
                sickness_value REAL,
                fibrosis_ratio REAL,
                zip_path TEXT NOT NULL,
                glb_path TEXT
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS fvc (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                fvc REAL NOT NULL,
                week_num INTEGER NOT NULL,
                confidence REAL NOT NULL,
                FOREIGN KEY (patient_id) REFERENCES patient (id) ON DELETE CASCADE
            );
        """)

        # Add missing columns dynamically if they do not exist
        cursor.execute("PRAGMA table_info(patient);")
        columns = [row[1] for row in cursor.fetchall()]
        if "smoking_status" not in columns:
            cursor.execute("ALTER TABLE patient ADD COLUMN smoking_status TEXT;")
            logger.info("Added smoking_status column to patient table")
        if "height" not in columns:
            cursor.execute("ALTER TABLE patient ADD COLUMN height REAL;")
            logger.info("Added height column to patient table")
        if "fvc_baseline" not in columns:
            cursor.execute("ALTER TABLE patient ADD COLUMN fvc_baseline REAL;")
            logger.info("Added fvc_baseline column to patient table")

        conn.commit()
        logger.info("Database tables initialized")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
    finally:
        conn.close()


def get_db_connection():
    """Get a new database connection."""
    logger.debug("Creating new database connection")
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn


def get_db():
    """Dependency to get a database connection (for FastAPI)."""
    logger.debug("Getting database connection for FastAPI dependency")
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()
        logger.debug("Database connection closed")
