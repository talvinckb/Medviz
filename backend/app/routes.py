import os
import sqlite3
from typing import List

from app.database import get_db
from app.processing.pipeline import process_patient_segmentation
from app.schemas import PatientDetail
from app.services import (
    db_add_patient,
    db_get_all_patients,
    db_get_patient,
    db_remove_patient,
)
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post(
    "/upload", response_model=PatientDetail, status_code=status.HTTP_201_CREATED
)
def add_patient(
    background_tasks: BackgroundTasks,
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
        background_tasks.add_task(
            process_patient_segmentation, new_patient["id"], new_patient["zip_path"]
        )
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


@router.get("/{patient_id}/slices")
def get_patient_slices(patient_id: int, db: sqlite3.Connection = Depends(get_db)):
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


@router.get("/{patient_id}/lung")
def get_patient_lung(patient_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Get the patient's 3D mesh GLB file
    """
    patient = db_get_patient(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient avec l'ID {patient_id} introuvable.",
        )

    glb_path = patient["glb_path"]
    if not glb_path or not os.path.exists(glb_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier 3D introuvable ou en cours de génération",
        )

    return FileResponse(
        path=glb_path,
        media_type="model/gltf-binary",
        filename=f"patient_{patient_id}.glb",
    )


@router.get("/", response_model=List[int])
def get_all_patients(db: sqlite3.Connection = Depends(get_db)):
    """
    Get the list of all patient IDs
    """
    return db_get_all_patients(db)
