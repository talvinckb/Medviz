import sqlite3
import os

DB_PATH = "medviz.db"
UPLOAD_DIR = "patients_data"


def init_db():
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS patient (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                age INTEGER NOT NULL,
                gender TEXT NOT NULL,
                lung_volume REAL, --TODO: remove nullable
                sickness_value REAL, --TODO: remove nullable
                zip_path TEXT NOT NULL
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

        conn.commit()
    finally:
        conn.close()


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn


def get_db():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()
