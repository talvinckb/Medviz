import os
import shutil
import sqlite3
from typing import List, Optional

from app.database import UPLOAD_DIR
from fastapi import UploadFile


def db_get_patient(conn: sqlite3.Connection, patient_id: int) -> Optional[dict]:
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, age, gender, lung_volume, mean_hu, std_hu, sickness_value, zip_path, glb_path FROM patient WHERE id = ?",
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
        INSERT INTO patient (name, age, gender, lung_volume, mean_hu, std_hu, sickness_value, zip_path, glb_path)
        VALUES (?, ?, ?, NULL, NULL, NULL, NULL, ?, NULL)
        """,
        (name, age, gender, ""),
    )
    conn.commit()
    patient_id = cursor.lastrowid  # to name the file with the patient ID

    patient_dir = f"{UPLOAD_DIR}/{patient_id}"
    os.makedirs(patient_dir, exist_ok=True)

    zip_path = f"{patient_dir}/slices.zip"

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
        "mean_hu": None,
        "std_hu": None,
        "zip_path": zip_path,
        "glb_path": None,
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

    cursor.execute("DELETE FROM patient WHERE id = ?", (patient_id,))
    conn.commit()

    patient_dir = f"{UPLOAD_DIR}/{patient_id}"
    if os.path.exists(patient_dir):
        shutil.rmtree(patient_dir, ignore_errors=True)

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


def db_update_patient_features(
    conn: sqlite3.Connection,
    patient_id: int,
    lung_volume: float,
    mean_hu: float,
    std_hu: float,
    sickness_value: float,
    glb_path: Optional[str] = None,
) -> None:
    """
    Update the computed radiomics features for a given patient
    """
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE patient SET lung_volume = ?, mean_hu = ?, std_hu = ?, sickness_value = ?, glb_path = ? WHERE id = ?",
        (lung_volume, mean_hu, std_hu, sickness_value, glb_path, patient_id),
    )
    conn.commit()
