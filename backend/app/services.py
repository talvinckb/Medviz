import os
import shutil
import sqlite3
from typing import List, Optional
from fastapi import UploadFile
from app.database import UPLOAD_DIR


def db_get_patient(conn: sqlite3.Connection, patient_id: int) -> Optional[dict]:
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, age, gender, lung_volume, sickness_value, zip_path FROM patient WHERE id = ?",
        (patient_id,),
    )
    row = cursor.fetchone()
    if row:
        patient_data = dict(row)
        patient_data["fvc_records"] = db_get_patient_fvc_records(conn, patient_id)
        return patient_data
    return None


def db_get_all_patients(conn: sqlite3.Connection) -> List[int]:
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM patient")
    rows = cursor.fetchall()
    return [row["id"] for row in rows]


def db_add_patient(
    conn: sqlite3.Connection, name: str, age: int, gender: str, file: UploadFile
) -> dict:
    """
    Add a patient in DB, save the ZIP file on disk and store the path in DB
    """
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO patient (name, age, gender, lung_volume, sickness_value, zip_path)
        VALUES (?, ?, ?, NULL, NULL, ?)
        """,
        (name, age, gender, ""),
    )
    conn.commit()
    patient_id = cursor.lastrowid  # to name the file with the patient ID

    zip_filename = f"{patient_id}.zip"
    zip_path = os.path.join(UPLOAD_DIR, zip_filename).replace("\\", "/")

    try:
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        cursor.execute("DELETE FROM patient WHERE id = ?", (patient_id,))
        conn.commit()
        raise RuntimeError(
            f"Impossible d'enregistrer le fichier ZIP de DICOM : {str(e)}"
        )

    cursor.execute(
        "UPDATE patient SET zip_path = ? WHERE id = ?", (zip_path, patient_id)
    )
    conn.commit()

    return {
        "id": patient_id,
        "name": name,
        "age": age,
        "gender": gender,
        "lung_volume": None,
        "sickness_value": None,
        "zip_path": zip_path,
        "fvc_records": [],
    }


def db_remove_patient(conn: sqlite3.Connection, patient_id: int) -> bool:
    """
    Delete a patient from the database + ZIP file
    """
    cursor = conn.cursor()

    patient = db_get_patient(conn, patient_id)
    if not patient:
        return False

    zip_path = patient["zip_path"]

    cursor.execute("DELETE FROM patient WHERE id = ?", (patient_id,))
    conn.commit()

    if zip_path and os.path.exists(zip_path):
        try:
            os.remove(zip_path)
        except Exception:
            pass

    return True


def db_get_patient_fvc_records(conn: sqlite3.Connection, patient_id: int) -> List[dict]:
    """
    Get fvc records for a patient, ordered by week_num ascending
    """
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, week_num, fvc, confidence FROM fvc WHERE patient_id = ? ORDER BY week_num ASC",
        (patient_id,),
    )
    rows = cursor.fetchall()
    return [dict(row) for row in rows]
