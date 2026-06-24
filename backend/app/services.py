import os
import shutil
import sqlite3
import zipfile
from typing import List, Optional

from app.database import UPLOAD_DIR
from app.logger import logger
from fastapi import UploadFile


def db_get_patient(conn: sqlite3.Connection, patient_id: int) -> Optional[dict]:
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, age, gender, smoking_status, height, fvc_baseline, lung_volume, optimal_fvc, mean_hu, std_hu, sickness_value, fibrosis_ratio, zip_path, glb_path FROM patient WHERE id = ?",
        (patient_id,),
    )
    row = cursor.fetchone()
    if row:
        patient_data = dict(row)
        patient_data["fvc_records"] = db_get_patient_fvc_records(conn, patient_id)
        logger.info(f"Patient {patient_id} retrieved from database")
        return patient_data
    logger.warning(f"Patient {patient_id} not found in database")
    return None


def db_get_all_patients(conn: sqlite3.Connection) -> List[int]:
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM patient")
    rows = cursor.fetchall()
    patient_ids = [row["id"] for row in rows]
    logger.info(f"Retrieved all patient IDs: {patient_ids}")
    return patient_ids


def db_add_patient(
    conn: sqlite3.Connection,
    name: str,
    age: int,
    gender: str,
    smoking_status: str,
    height: float,
    fvc_baseline: float,
    file: Optional[UploadFile],
    files: Optional[List[UploadFile]] = None,
) -> dict:
    """
    Add a patient in DB, save the ZIP file on disk and store the path in DB
    """
    logger.info(
        f"Adding new patient: name={name}, age={age}, gender={gender}, smoking_status={smoking_status}"
    )
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO patient (name, age, gender, smoking_status, height, fvc_baseline, lung_volume, optimal_fvc, mean_hu, std_hu, sickness_value, fibrosis_ratio, zip_path, glb_path)
        VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, NULL)
        """,
        (name, age, gender, smoking_status, height, fvc_baseline, ""),
    )
    conn.commit()
    patient_id = cursor.lastrowid  # to name the file with the patient ID

    patient_dir = f"{UPLOAD_DIR}/{patient_id}"
    os.makedirs(patient_dir, exist_ok=True)

    zip_path = f"{patient_dir}/slices.zip"

    try:
        if file:
            with open(zip_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"ZIP file saved for patient {patient_id} at {zip_path}")
        elif files:
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                for f in files:
                    if f.filename:
                        zipf.writestr(f.filename, f.file.read())
            logger.info(
                f"Created ZIP file from {len(files)} files for patient {patient_id} at {zip_path}"
            )
    except Exception as e:
        cursor.execute("DELETE FROM patient WHERE id = ?", (patient_id,))
        conn.commit()
        logger.error(f"Failed to save ZIP file for patient {patient_id}: {str(e)}")
        raise RuntimeError(
            f"Impossible d'enregistrer le fichier ZIP de DICOM : {str(e)}"
        )

    cursor.execute(
        "UPDATE patient SET zip_path = ? WHERE id = ?", (zip_path, patient_id)
    )
    conn.commit()

    new_patient = {
        "id": patient_id,
        "name": name,
        "age": age,
        "gender": gender,
        "smoking_status": smoking_status,
        "height": height,
        "fvc_baseline": fvc_baseline,
        "lung_volume": None,
        "optimal_fvc": None,
        "sickness_value": None,
        "mean_hu": None,
        "std_hu": None,
        "zip_path": zip_path,
        "glb_path": None,
        "fvc_records": [],
        "fibrosis_ratio": None,
    }
    logger.info(f"Patient {patient_id} added to database")
    return new_patient


def db_remove_patient(conn: sqlite3.Connection, patient_id: int) -> bool:
    """
    Delete a patient from the database + ZIP file
    """
    logger.info(f"Attempting to remove patient {patient_id}")
    cursor = conn.cursor()

    patient = db_get_patient(conn, patient_id)
    if not patient:
        logger.warning(f"Patient {patient_id} not found, cannot remove")
        return False

    cursor.execute("DELETE FROM patient WHERE id = ?", (patient_id,))
    conn.commit()

    patient_dir = f"{UPLOAD_DIR}/{patient_id}"
    if os.path.exists(patient_dir):
        shutil.rmtree(patient_dir, ignore_errors=True)
        logger.info(f"Removed directory {patient_dir} for patient {patient_id}")

    logger.info(f"Patient {patient_id} removed from database")
    return True


def db_get_patient_fvc_records(conn: sqlite3.Connection, patient_id: int) -> List[dict]:
    """
    Get fvc records for a patient, ordered by week_num ascending
    """
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, week_num, fvc, confidence, q005, q020, q050, q080, q095 FROM fvc WHERE patient_id = ? ORDER BY week_num ASC",
        (patient_id,),
    )
    rows = cursor.fetchall()
    fvc_records = [dict(row) for row in rows]
    logger.info(f"Retrieved {len(fvc_records)} FVC records for patient {patient_id}")
    return fvc_records


def db_update_patient_features(
    conn: sqlite3.Connection,
    patient_id: int,
    lung_volume: float,
    optimal_fvc: float,
    mean_hu: float,
    std_hu: float,
    sickness_value: float,
    fibrosis_ratio: float,
    glb_path: Optional[str] = None,
) -> None:
    """
    Update the computed radiomics features for a given patient
    """
    logger.info(
        f"Updating features for patient {patient_id}: lung_volume={lung_volume}, "
        f"optimal_fvc={optimal_fvc}, mean_hu={mean_hu}, std_hu={std_hu}, sickness_value={sickness_value}, fibrosis_ratio={fibrosis_ratio}"
    )
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE patient SET lung_volume = ?, optimal_fvc = ?, mean_hu = ?, std_hu = ?, sickness_value = ?, fibrosis_ratio = ?, glb_path = ? WHERE id = ?",
        (
            lung_volume,
            optimal_fvc,
            mean_hu,
            std_hu,
            sickness_value,
            fibrosis_ratio,
            glb_path,
            patient_id,
        ),
    )
    conn.commit()
    logger.info(f"Features updated for patient {patient_id}")


def db_add_fvc_records(
    conn: sqlite3.Connection, patient_id: int, records: List[dict]
) -> None:
    """
    Inserts a list of FVC predictions for a patient
    """
    logger.info(
        f"Adding {len(records)} FVC prediction records for patient {patient_id}"
    )
    cursor = conn.cursor()
    # First, clear any existing records for this patient
    cursor.execute("DELETE FROM fvc WHERE patient_id = ?", (patient_id,))

    # Bulk insert
    cursor.executemany(
        """
        INSERT INTO fvc (patient_id, fvc, week_num, confidence, q005, q020, q050, q080, q095)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (
                patient_id,
                r["fvc"],
                r["week_num"],
                r["confidence"],
                r.get("q005"),
                r.get("q020"),
                r.get("q050"),
                r.get("q080"),
                r.get("q095"),
            )
            for r in records
        ],
    )
    conn.commit()
    logger.info(f"FVC prediction records added successfully for patient {patient_id}")
