import os
import sqlite3
from typing import List, Optional

from app.database import get_db
from app.logger import logger
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
    smoking_status: str = Form("Never smoked", description="Statut fumeur du patient"),
    height: float = Form(..., description="Taille du patient en cm"),
    fvc_baseline: float = Form(..., description="FVC baseline du patient en mL"),
    file: Optional[UploadFile] = File(
        None, description="ZIP contenant les fichiers DICOM"
    ),
    files: Optional[List[UploadFile]] = File(
        None, description="Fichiers DICOM individuels"
    ),
    db: sqlite3.Connection = Depends(get_db),
):
    """
    Add a new patient with their zip DICOM file or multiple DICOM files
    """
    logger.info(
        f"Upload request received for patient: name={name}, age={age}, gender={gender}, smoking_status={smoking_status}"
    )

    if not file and not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez fournir un fichier .zip ou plusieurs fichiers .dcm.",
        )

    if file and (not file.filename or not file.filename.lower().endswith(".zip")):
        logger.warning(f"Invalid file type for patient upload: {file.filename}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier doit être un .zip avec les fichiers DICOM.",
        )

    if age < 0 or (gender != "F" and gender != "M"):
        logger.warning(f"Invalid age or gender for patient: age={age}, gender={gender}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Age ou sexe invalide"
        )

    if smoking_status not in ["Never smoked", "Ex-smoker", "Currently smokes"]:
        logger.warning(f"Invalid smoking status for patient: {smoking_status}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Statut fumeur invalide"
        )

    try:
        new_patient = db_add_patient(
            db, name, age, gender, smoking_status, height, fvc_baseline, file, files
        )
        logger.info(
            f"Patient created successfully: id={new_patient['id']}, zip_path={new_patient['zip_path']}"
        )

        background_tasks.add_task(
            process_patient_segmentation,
            new_patient["id"],
            new_patient["zip_path"],
            age,
            gender,
            smoking_status,
            height,
            fvc_baseline,
        )
        logger.info(f"Background task started for patient {new_patient['id']}")

        return new_patient
    except Exception as e:
        logger.error(f"Failed to add patient: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur DB lors la création du patient : {str(e)}",
        )


@router.delete("/{patient_id}", status_code=status.HTTP_200_OK)
def remove_patient(patient_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Delete a patient from the database + delete the ZIP file
    """
    logger.info(f"Request to delete patient with id={patient_id}")
    if not db_remove_patient(db, patient_id):
        logger.warning(f"Patient with id={patient_id} not found, cannot delete")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient avec l'ID {patient_id} introuvable.",
        )
    logger.info(f"Patient with id={patient_id} deleted successfully")
    return {"message": f"Patient avec l'ID {patient_id} supprimé avec succès."}


@router.get("/{patient_id}/data", response_model=PatientDetail)
def get_patient(patient_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Get a patient by ID
    """
    logger.info(f"Request to retrieve patient with id={patient_id}")
    patient = db_get_patient(db, patient_id)
    if not patient:
        logger.warning(f"Patient with id={patient_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient avec l'identifiant {patient_id} introuvable.",
        )
    logger.info(f"Patient with id={patient_id} retrieved successfully")
    return patient


@router.get("/{patient_id}/slices")
def get_patient_slices(patient_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Get the patient's DICOM ZIP file
    """
    logger.info(f"Request to retrieve DICOM ZIP for patient with id={patient_id}")
    patient = db_get_patient(db, patient_id)
    if not patient:
        logger.warning(f"Patient with id={patient_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient avec l'ID {patient_id} introuvable.",
        )

    zip_path = patient["zip_path"]
    if not zip_path or not os.path.exists(zip_path):
        logger.error(f"ZIP file not found for patient with id={patient_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier ZIP introuvable",
        )

    logger.info(f"DICOM ZIP file retrieved for patient with id={patient_id}")
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
    logger.info(f"Request to retrieve 3D model for patient with id={patient_id}")
    patient = db_get_patient(db, patient_id)
    if not patient:
        logger.warning(f"Patient with id={patient_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient avec l'ID {patient_id} introuvable.",
        )

    glb_path = patient["glb_path"]
    if not glb_path or not os.path.exists(glb_path):
        logger.error(f"3D model file not found for patient with id={patient_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fichier 3D introuvable ou en cours de génération",
        )

    logger.info(f"3D model file retrieved for patient with id={patient_id}")
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
    logger.info("Request to retrieve all patient IDs")
    patient_ids = db_get_all_patients(db)
    logger.info(f"Retrieved {len(patient_ids)} patient IDs")
    return patient_ids
