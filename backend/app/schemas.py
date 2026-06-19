from typing import List, Optional

from app.logger import logger
from pydantic import BaseModel, Field


class FVCRecord(BaseModel):
    """FVC schema"""

    id: int = Field(..., description="ID FVC")
    week_num: int = Field(..., description="Numéro de la semaine de mesure")
    fvc: float = Field(..., description="FVC")
    confidence: float = Field(..., description="Confiance de prédiction")

    model_config = {"from_attributes": True}


class PatientDetail(BaseModel):
    """Patient schema"""

    id: int = Field(..., description="ID du patient")
    name: str = Field(..., description="Nom du patient")
    age: int = Field(..., description="Âge du patient")
    gender: str = Field(..., description="Sexe du patient")
    smoking_status: Optional[str] = Field(None, description="Statut fumeur du patient")
    height: Optional[float] = Field(None, description="Taille du patient (en cm)")
    fvc_baseline: Optional[float] = Field(None, description="FVC baseline (en mL)")
    lung_volume: Optional[float] = Field(
        None,
        description="Volume du poumon (en mL)",  ##TODO: remove None
    )
    optimal_fvc: Optional[float] = Field(
        None,
        description="FVC optimale (en mL)",  ##TODO: remove None
    )
    mean_hu: Optional[float] = Field(None, description="Moyenne HU")
    std_hu: Optional[float] = Field(None, description="Ecart type HU")
    sickness_value: Optional[float] = Field(
        None,
        description="Indice de gravité",  ##TODO: remove None
    )
    fibrosis_ratio: Optional[float] = Field(
        None,
        description="Ratio de fibrose",  ##TODO: remove None
    )
    zip_path: str = Field(..., description="Path au DICOM (zip)")
    glb_path: Optional[str] = Field(None, description="Path au fichier 3D (glb)")
    fvc_records: List[FVCRecord] = Field(
        default_factory=list, description="FVC par semaine"
    )

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": 1,
                "name": "Jean Dupont",
                "age": 45,
                "gender": "M",
                "lung_volume": None,
                "mean_hu": None,
                "std_hu": None,
                "sickness_value": None,
                "zip_path": "patients_data/1/slices.zip",
                "glb_path": "patients_data/1/lung.glb",
                "fvc_records": [
                    {"id": 10, "week_num": 1, "fvc": 3.2, "confidence": 0.95},
                    {"id": 11, "week_num": 4, "fvc": 3.4, "confidence": 0.98},
                ],
            }
        },
    }


logger.info("Pydantic models for FVCRecord and PatientDetail are configured")
