from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, status
from fastapi.responses import FileResponse
import sqlite3
import os
from typing import List

from app.database import get_db
from app.schemas import PatientDetail
from app.services import (
    db_get_patient,
    db_add_patient,
    db_remove_patient,
    db_get_all_patients,
)

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post(
    "/upload", response_model=PatientDetail, status_code=status.HTTP_201_CREATED
)
def add_patient(
    name: str = Form(..., description="Nom patient"),
    age: int = Form(..., description="Âge du patient"),
    gender: str = Form(..., description="Sexe du patient"),
    file: UploadFile = File(..., description="ZIP contenant les fichiers DICOM"),
    db: sqlite3.Connection = Depends(get_db),
):
    """
    Add a new patient with their zip DICOM file
    """
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier doit être un .zip avec les fichiers DICOM.",
        )

    if age < 0 or (gender != "F" and gender != "M"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Age ou sexe invalide"
        )

    try:
        new_patient = db_add_patient(db, name, age, gender, file)
        return new_patient
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur DB lors la création du patient : {str(e)}",
        )


@router.delete("/{patient_id}", status_code=status.HTTP_200_OK)
def remove_patient(patient_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Delete a patient from the database + delete the ZIP file
    """
    deleted = db_remove_patient(db, patient_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient avec l'ID {patient_id} introuvable.",
        )
    return {"message": f"Patient avec l'ID {patient_id} supprimé avec succès."}


@router.get("/{patient_id}/data", response_model=PatientDetail)
def get_patient(patient_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Get a patient by ID
    """
    patient = db_get_patient(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient avec l'identifiant {patient_id} introuvable.",
        )
    return patient


@router.get("/{patient_id}/lung")
def get_patient_lung(patient_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Get the patient's DICOM ZIP file
    """
    patient = db_get_patient(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient avec l'ID {patient_id} introuvable.",
        )

    zip_path = patient["zip_path"]
    if not zip_path or not os.path.exists(zip_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier ZIP introuvable",
        )

    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=f"patient_{patient_id}.zip",
    )


@router.get("/", response_model=List[int])
def get_all_patients(db: sqlite3.Connection = Depends(get_db)):
    """
    Get the list of all patient IDs
    """
    return db_get_all_patients(db)
