import io
import os
import sqlite3
import zipfile

import app.database
import app.services
import numpy as np
import pytest
from app.database import get_db, init_db
from fastapi.testclient import TestClient
from main import app as fastapi_app

TEST_DB_PATH = "test_medviz.db"
TEST_UPLOAD_DIR = "test_patients_data"


@pytest.fixture(autouse=True)
def setup_test_environment(monkeypatch, tmp_path):
    """Configuration de l'environnement de test (DB temporaire et dossier d'uploads temporaire)."""

    DB_TMP_PATH = os.path.join(tmp_path, TEST_DB_PATH)
    UPLOAD_TMP_DIR = os.path.join(tmp_path, TEST_UPLOAD_DIR)

    # 1. Configuration des chemins de test via monkeypatching
    monkeypatch.setattr(app.database, "DB_PATH", DB_TMP_PATH)
    monkeypatch.setattr(app.database, "UPLOAD_DIR", UPLOAD_TMP_DIR)
    monkeypatch.setattr(app.services, "UPLOAD_DIR", UPLOAD_TMP_DIR)

    # 2. Nettoyage initial des fichiers résiduels
    if os.path.exists(DB_TMP_PATH):
        os.remove(DB_TMP_PATH)
    if os.path.exists(UPLOAD_TMP_DIR):
        import shutil

        shutil.rmtree(UPLOAD_TMP_DIR)

    # 3. Initialisation de la base de données de test et du dossier d'upload
    init_db()

    yield

    # 4. Nettoyage après la fin de la session de tests
    if os.path.exists(DB_TMP_PATH):
        try:
            os.remove(DB_TMP_PATH)
        except Exception:
            pass

    if os.path.exists(UPLOAD_TMP_DIR):
        import shutil

        try:
            shutil.rmtree(UPLOAD_TMP_DIR)
        except Exception:
            pass


@pytest.fixture
def db_connection():
    """Fournit une connexion directe à la base de données de test SQLite."""

    conn = sqlite3.connect(app.database.DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


@pytest.fixture
def client():
    """Fournit un TestClient de FastAPI configuré pour utiliser la base de données de test."""

    def override_get_db():
        conn = sqlite3.connect(app.database.DB_PATH)
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    # Surcharger la dépendance get_db de FastAPI
    fastapi_app.dependency_overrides[get_db] = override_get_db

    with TestClient(fastapi_app) as test_client:
        yield test_client

    # Retirer la surcharge après le test
    fastapi_app.dependency_overrides.clear()


def create_mock_zip() -> io.BytesIO:
    """Génère un fichier ZIP en mémoire pour simuler les DICOM."""
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        zip_file.writestr("dicom_001.dcm", "Faux contenu DICOM médical")
    zip_buffer.seek(0)
    return zip_buffer


# ==========================================
# TESTS DES ENDPOINTS
# ==========================================


def test_read_root(client):
    """Vérifie le endpoint racine /."""
    response = client.get("/")
    assert response.status_code == 200
    json_data = response.json()
    assert "message" in json_data
    assert "medviz" in json_data["message"].lower()


def test_add_patient_success(client):
    """Vérifie la création d'un patient avec métadonnées et ZIP de DICOM."""
    zip_data = create_mock_zip()
    response = client.post(
        "/patients/upload",
        data={
            "name": "Alice Liddell",
            "age": 10,
            "gender": "F",
            "height": 140.0,
            "fvc_baseline": 3000.0,
        },
        files={"file": ("alice_dicoms.zip", zip_data, "application/zip")},
    )

    assert response.status_code == 201
    patient = response.json()
    assert patient["name"] == "Alice Liddell"
    assert patient["age"] == 10
    assert patient["gender"] == "F"
    assert patient["lung_volume"] is None
    assert patient["sickness_value"] is None
    assert "zip_path" in patient
    assert os.path.normpath(patient["zip_path"]) == os.path.normpath(
        f"{app.database.UPLOAD_DIR}/{patient['id']}/slices.zip"
    )

    # Vérification que le fichier a bien été écrit sur le disque
    assert os.path.exists(patient["zip_path"])


def test_add_patient_multiple_files_success(client):
    """Vérifie la création d'un patient avec de multiples fichiers DICOM au lieu d'un ZIP."""
    dcm1 = io.BytesIO(b"faux contenu 1")
    dcm2 = io.BytesIO(b"faux contenu 2")
    response = client.post(
        "/patients/upload",
        data={
            "name": "Multi File",
            "age": 45,
            "gender": "M",
            "height": 175.0,
            "fvc_baseline": 4000.0,
        },
        files=[
            ("files", ("dossier/image1.dcm", dcm1, "application/dicom")),
            ("files", ("dossier/image2.dcm", dcm2, "application/dicom")),
        ],
    )

    assert response.status_code == 201
    patient = response.json()
    assert patient["name"] == "Multi File"
    assert "zip_path" in patient
    assert os.path.exists(patient["zip_path"])

    # Vérifie que le zip généré par le backend contient bien les fichiers avec l'arborescence
    with zipfile.ZipFile(patient["zip_path"], "r") as zipf:
        names = zipf.namelist()
        assert "dossier/image1.dcm" in names
        assert "dossier/image2.dcm" in names


def test_add_patient_missing_files(client):
    """Vérifie le rejet si aucun fichier n'est fourni."""
    response = client.post(
        "/patients/upload",
        data={
            "name": "No File",
            "age": 45,
            "gender": "M",
            "height": 175.0,
            "fvc_baseline": 4000.0,
        },
    )
    assert response.status_code == 400
    assert (
        "fichier .zip ou plusieurs fichiers .dcm" in response.json()["detail"].lower()
    )


def test_add_patient_invalid_extension(client):
    """Vérifie qu'un fichier autre qu'un .zip est rejeté."""
    txt_data = io.BytesIO(b"ceci est un simple fichier texte")
    response = client.post(
        "/patients/upload",
        data={
            "name": "Bob",
            "age": 40,
            "gender": "M",
            "height": 175.0,
            "fvc_baseline": 4000.0,
        },
        files={"file": ("bob_notes.txt", txt_data, "text/plain")},
    )

    assert response.status_code == 400
    assert "doit être un .zip" in response.json()["detail"].lower()


def test_get_all_patients(client):
    """Vérifie la récupération de la liste des IDs de patients."""
    # 1. Liste initialement vide
    response = client.get("/patients/")
    assert response.status_code == 200
    assert response.json() == []

    # 2. Ajout de deux patients
    zip_data_1 = create_mock_zip()
    client.post(
        "/patients/upload",
        data={
            "name": "Patient Un",
            "age": 20,
            "gender": "M",
            "height": 180.0,
            "fvc_baseline": 4200.0,
        },
        files={"file": ("p1.zip", zip_data_1, "application/zip")},
    )
    zip_data_2 = create_mock_zip()
    client.post(
        "/patients/upload",
        data={
            "name": "Patient Deux",
            "age": 30,
            "gender": "F",
            "height": 165.0,
            "fvc_baseline": 3200.0,
        },
        files={"file": ("p2.zip", zip_data_2, "application/zip")},
    )

    # 3. La liste doit contenir [1, 2]
    response = client.get("/patients/")
    assert response.status_code == 200
    ids = response.json()
    assert len(ids) == 2
    assert 1 in ids
    assert 2 in ids


def test_get_patient_data_success(client, db_connection):
    """Vérifie la récupération des détails d'un patient et son historique FVC."""
    # 1. Ajout d'un patient
    zip_data = create_mock_zip()
    add_response = client.post(
        "/patients/upload",
        data={
            "name": "Charlie Bucket",
            "age": 12,
            "gender": "M",
            "height": 145.0,
            "fvc_baseline": 2500.0,
        },
        files={"file": ("charlie.zip", zip_data, "application/zip")},
    )
    patient_id = add_response.json()["id"]

    # 2. Ajout de mesures FVC en base pour simuler un calcul ultérieur
    cursor = db_connection.cursor()
    cursor.execute(
        "INSERT INTO fvc (patient_id, fvc, week_num, confidence) VALUES (?, 2.5, 2, 0.94)",
        (patient_id,),
    )
    cursor.execute(
        "INSERT INTO fvc (patient_id, fvc, week_num, confidence) VALUES (?, 2.7, 5, 0.97)",
        (patient_id,),
    )
    db_connection.commit()

    # 3. Récupération via l'API
    response = client.get(f"/patients/{patient_id}/data")
    assert response.status_code == 200
    patient = response.json()
    assert patient["name"] == "Charlie Bucket"
    assert len(patient["fvc_records"]) == 2

    # Vérification du tri par numéro de semaine
    assert patient["fvc_records"][0]["week_num"] == 2
    assert patient["fvc_records"][0]["fvc"] == 2.5
    assert patient["fvc_records"][1]["week_num"] == 5
    assert patient["fvc_records"][1]["fvc"] == 2.7


def test_get_patient_data_not_found(client):
    """Vérifie la réponse 404 lors de la récupération d'un patient inexistant."""
    response = client.get("/patients/999/data")
    assert response.status_code == 404
    assert "introuvable" in response.json()["detail"].lower()


def test_get_patient_slices_success(client):
    """Vérifie le téléchargement du fichier ZIP de DICOM."""
    # 1. Ajout d'un patient
    zip_data = create_mock_zip()
    add_response = client.post(
        "/patients/upload",
        data={
            "name": "Diana Prince",
            "age": 30,
            "gender": "F",
            "height": 170.0,
            "fvc_baseline": 3500.0,
        },
        files={"file": ("diana.zip", zip_data, "application/zip")},
    )
    patient_id = add_response.json()["id"]

    # 2. Téléchargement du fichier
    response = client.get(f"/patients/{patient_id}/slices")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert f"patient_{patient_id}.zip" in response.headers["content-disposition"]

    # Vérification que le fichier reçu est bien un ZIP lisible
    zip_received = zipfile.ZipFile(io.BytesIO(response.content))
    assert "dicom_001.dcm" in zip_received.namelist()


def test_get_patient_slices_not_found(client):
    """Vérifie la réponse 404 lors du téléchargement pour un patient inexistant."""
    response = client.get("/patients/999/slices")
    assert response.status_code == 404


def test_get_patient_lung_success(client, db_connection):
    """Vérifie le téléchargement du fichier GLB de maillage 3D."""
    # 1. Ajout d'un patient
    zip_data = create_mock_zip()
    add_response = client.post(
        "/patients/upload",
        data={
            "name": "Bruce Wayne",
            "age": 40,
            "gender": "M",
            "height": 185.0,
            "fvc_baseline": 4500.0,
        },
        files={"file": ("bruce.zip", zip_data, "application/zip")},
    )
    patient_id = add_response.json()["id"]

    # 2. Création d'un faux fichier .glb et mise à jour de la BDD
    patient_dir = f"{app.database.UPLOAD_DIR}/{patient_id}"
    os.makedirs(patient_dir, exist_ok=True)
    glb_path = f"{patient_dir}/lung.glb"
    with open(glb_path, "wb") as f:
        f.write(b"dummy glb content")

    cursor = db_connection.cursor()
    cursor.execute(
        "UPDATE patient SET glb_path = ? WHERE id = ?", (glb_path, patient_id)
    )
    db_connection.commit()

    # 3. Téléchargement du fichier
    response = client.get(f"/patients/{patient_id}/lung")
    assert response.status_code == 200
    assert response.headers["content-type"] == "model/gltf-binary"
    assert f"patient_{patient_id}.glb" in response.headers["content-disposition"]
    assert response.content == b"dummy glb content"


def test_get_patient_lung_not_ready(client):
    """Vérifie la réponse 404 si le GLB n'est pas encore généré ou introuvable."""
    zip_data = create_mock_zip()
    add_response = client.post(
        "/patients/upload",
        data={
            "name": "Clark Kent",
            "age": 35,
            "gender": "M",
            "height": 190.0,
            "fvc_baseline": 4800.0,
        },
        files={"file": ("clark.zip", zip_data, "application/zip")},
    )
    patient_id = add_response.json()["id"]

    # Le GLB n'est pas prêt car la vraie pipeline en tâche de fond va crasher sur ce mock
    response = client.get(f"/patients/{patient_id}/lung")
    assert response.status_code == 404


def test_remove_patient_success(client, db_connection):
    """Vérifie la suppression complète (BDD en cascade + fichier physique)."""
    # 1. Ajout d'un patient et récupération des IDs
    zip_data = create_mock_zip()
    add_response = client.post(
        "/patients/upload",
        data={
            "name": "Evan Wright",
            "age": 28,
            "gender": "M",
            "height": 178.0,
            "fvc_baseline": 4100.0,
        },
        files={"file": ("evan.zip", zip_data, "application/zip")},
    )
    patient = add_response.json()
    patient_id = patient["id"]
    zip_path = patient["zip_path"]

    # Ajout d'un FVC associé
    cursor = db_connection.cursor()
    cursor.execute(
        "INSERT INTO fvc (patient_id, fvc, week_num, confidence) VALUES (?, 3.5, 1, 0.90)",
        (patient_id,),
    )
    db_connection.commit()

    # 2. On s'assure que le fichier ZIP existe avant la suppression
    assert os.path.exists(zip_path)

    # 3. Suppression via l'API
    response = client.delete(f"/patients/{patient_id}")
    assert response.status_code == 200
    assert "supprimé avec succès" in response.json()["message"].lower()

    # 4. Vérification que le dossier du patient a été détruit physiquement
    patient_dir = f"{app.database.UPLOAD_DIR}/{patient_id}"
    assert not os.path.exists(patient_dir)

    # 5. Vérification que le patient n'existe plus en BDD
    cursor.execute("SELECT COUNT(*) FROM patient WHERE id = ?", (patient_id,))
    assert cursor.fetchone()[0] == 0

    # 6. Vérification que les lignes FVC ont bien été supprimées en cascade
    cursor.execute("SELECT COUNT(*) FROM fvc WHERE patient_id = ?", (patient_id,))
    assert cursor.fetchone()[0] == 0


def test_remove_patient_not_found(client):
    """Vérifie la réponse 404 lors de la suppression d'un patient inexistant."""
    response = client.delete("/patients/999")
    assert response.status_code == 404


def test_background_segmentation_pipeline(client, db_connection, mocker):
    """Vérifie que la pipeline de segmentation en background s'exécute et met à jour la BDD."""

    # Mocking pydicom objects
    class MockDicom:
        def __init__(self, z_pos):
            self.ImagePositionPatient = [0.0, 0.0, z_pos]
            self.PatientName = ""
            self.PatientID = ""
            self.RescaleIntercept = -1024
            self.RescaleSlope = 1
            self.PixelSpacing = [1.0, 1.0]
            # Create a 20x20 array (tissue in the middle, air on the outside)
            arr = (
                np.ones((20, 20), dtype=np.int16) * 1024
            )  # air (1024 - 1024 = 0 HU normally, wait, 0 HU is water)
            # Let's make air -1000 HU -> value = 24
            arr = np.ones((20, 20), dtype=np.int16) * 24
            # Make tissue in the center: 0 HU -> value = 1024
            arr[5:15, 5:15] = 1024
            self.pixel_array = arr

    def mock_dcmread(path):
        # Extract the index from 'dicom_X.dcm' to use as Z position
        z_index = int(path.split("_")[-1].split(".")[0])
        return MockDicom(float(z_index))

    mocker.patch("pydicom.dcmread", side_effect=mock_dcmread)
    mocker.patch(
        "app.processing.pipeline.extract_radiomics_features",
        return_value=[3000.0, -500.0, 200.0, 0.05],
    )

    # Generate a ZIP with 10 mocked slices, distributed in subdirectories to test os.walk
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        for i in range(10):
            folder_name = f"folder{i % 2}"
            zip_file.writestr(f"{folder_name}/dicom_{i}.dcm", "dummy")
    zip_buffer.seek(0)

    # 1. Upload the patient
    add_response = client.post(
        "/patients/upload",
        data={
            "name": "Frank",
            "age": 55,
            "gender": "M",
            "height": 175.0,
            "fvc_baseline": 4000.0,
        },
        files={"file": ("frank.zip", zip_buffer, "application/zip")},
    )
    assert add_response.status_code == 201
    patient_id = add_response.json()["id"]

    # In Starlette TestClient, background tasks run synchronously immediately after the response is generated.
    # Therefore, by this point, the pipeline should have finished updating the database.

    # 2. Verify that the features are populated
    get_response = client.get(f"/patients/{patient_id}/data")
    assert get_response.status_code == 200

    patient_data = get_response.json()
    assert patient_data["lung_volume"] is not None
    assert patient_data["sickness_value"] is not None
    assert patient_data["mean_hu"] is not None
    assert patient_data["std_hu"] is not None
