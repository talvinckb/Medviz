from pydantic import BaseModel, Field
from typing import List, Optional


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
    lung_volume: Optional[float] = Field(
        None,
        description="Volume du poumon (en litres)",  ##TODO: remove None
    )
    sickness_value: Optional[float] = Field(
        None,
        description="Indice de gravité",  ##TODO: remove None
    )
    zip_path: str = Field(..., description="Path au DICOM (zip)")
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
                "sickness_value": None,
                "zip_path": "patients_data/1.zip",
                "fvc_records": [
                    {"id": 10, "week_num": 1, "fvc": 3.2, "confidence": 0.95},
                    {"id": 11, "week_num": 4, "fvc": 3.4, "confidence": 0.98},
                ],
            }
        },
    }
