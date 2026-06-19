import os
import tempfile
import zipfile

import numpy as np
import pandas as pd
import pydicom
import scipy
import trimesh
import xgboost as xgb
from app.database import UPLOAD_DIR, get_db_connection
from app.logger import logger
from app.services import db_add_fvc_records, db_update_patient_features
from skimage import measure, morphology
from sklearn.cluster import KMeans
from spiref import gli12


def calculate_optimal_FVC(age, sex, height):
    """
    Calculates the optimal Forced Vital Capacity (FVC) in milliliters based on age, sex, and height using the GLI-2012 reference values.
    Arguments:
        age (int): Age of the patient in years.
        height (float): Height of the patient in centimeters.
        sex (str): Sex of the patient, either 'male' or 'female'.
    """

    gender = "male" if sex == "M" else "female"

    rvc = gli12.GLIReferenceValueCalculator()
    optimal_fvc = rvc.calculate_fvc(gender, height, age, race="Cau")
    return optimal_fvc * 1000  # Convert from liters to milliliters


def load_and_sort_scan(patient_id, base_dir):
    """
    Loads DICOM files from a directory and sorts them spatially.
    """
    logger.info(f"Loading and sorting DICOM slices for patient {patient_id}")
    slices = []
    for root, _, files in os.walk(base_dir):
        for f in files:
            path = os.path.join(root, f)
            try:
                dicom_slice = pydicom.dcmread(path)
                # Anonymize
                dicom_slice.PatientName = "ANONYMOUS"
                dicom_slice.PatientID = str(patient_id)
                slices.append(dicom_slice)
            except Exception:
                # Ignore non-dicom files
                logger.warning(f"Ignoring non-DICOM file: {f}")
                pass

    # Sort using physical Z coordinate instead of InstanceNumber for safety
    slices.sort(key=lambda x: float(x.ImagePositionPatient[2]))
    logger.info(f"Loaded {len(slices)} DICOM slices for patient {patient_id}")
    return slices


def get_pixels_hu(slices):
    """
    Converts pixel arrays to Hounsfield Units (HU).
    """
    logger.info("Converting pixel arrays to Hounsfield Units (HU)")
    image = np.stack([s.pixel_array for s in slices]).astype(np.int16)

    # Set outside scanner pixels to Air (-1000 HU) instead of 0
    image[image <= -1000] = -1000

    # Convert to Hounsfield Units (HU)
    for slice_idx in range(len(slices)):
        intercept = slices[slice_idx].RescaleIntercept
        slope = slices[slice_idx].RescaleSlope

        if slope != 1:
            image[slice_idx] = slope * image[slice_idx].astype(np.float64)
            image[slice_idx] = image[slice_idx].astype(np.int16)

        image[slice_idx] += np.int16(intercept)

    return np.array(image, dtype=np.int16)


def resample_volume(image, slices, new_spacing=[1, 1, 1]):
    """
    Resamples the 3D volume to an isotropic spacing.
    """
    logger.info("Resampling 3D volume to isotropic spacing")
    try:
        z_spacing = np.abs(
            slices[0].ImagePositionPatient[2] - slices[1].ImagePositionPatient[2]
        )
    except AttributeError:
        logger.error(
            "Failed to resample volume: slices do not have ImagePositionPatient"
        )
        z_spacing = slices[0].SliceThickness

    spacing = np.array(
        [z_spacing, slices[0].PixelSpacing[0], slices[0].PixelSpacing[1]],
        dtype=np.float32,
    )

    resize_factor = spacing / new_spacing
    new_real_shape = image.shape * resize_factor
    new_shape = np.round(new_real_shape)
    real_resize_factor = new_shape / image.shape

    # mode="nearest" to prevent edge artifacts
    resampled_image = scipy.ndimage.zoom(
        image, real_resize_factor, order=3, mode="nearest"
    )

    return resampled_image


def generate_lung_mask(volume_3d):
    """
    Generates a 3D boolean mask of the lungs.
    """
    logger.info("Generating a 3D boolean mask of the lungs")
    z_slices, row_size, col_size = volume_3d.shape
    mask_3d = np.zeros_like(volume_3d, dtype=np.int8)

    # Global threshold via K-Means on middle slice
    mid_slice = volume_3d[z_slices // 2]
    mean_val, std_val = np.mean(mid_slice), np.std(mid_slice)

    if std_val > 0:
        img_norm = (mid_slice - mean_val) / std_val
        middle = img_norm[
            int(col_size / 5) : int(col_size / 5 * 4),
            int(row_size / 5) : int(row_size / 5 * 4),
        ]

        kmeans = KMeans(n_clusters=2, n_init=3, random_state=42).fit(
            np.reshape(middle, [-1, 1])
        )
        global_threshold = np.mean(kmeans.cluster_centers_)
    else:
        global_threshold = 0

    for i in range(z_slices):
        img = volume_3d[i]

        c_mean, c_std = np.mean(img), np.std(img)
        if c_std == 0:
            continue
        img_norm = (img - c_mean) / c_std

        # 1. On identifie le padding artificiel (le coin 0,0 est toujours du padding ou de l'air pur)
        padding_val = img[0, 0]
        padding_mask = np.abs(img - padding_val) < 10
        fov_mask = ~padding_mask  # La vraie zone du scanner

        # 2. On remplit les trous (le patient) pour obtenir un cercle plein
        fov_mask = scipy.ndimage.binary_fill_holes(fov_mask)

        # 3. On extrait une bordure de 5 pixels à l'intérieur de ce cercle
        eroded_fov = morphology.erosion(fov_mask, np.ones([11, 11]))
        fov_boundary = fov_mask & ~eroded_fov

        # Binarisation pour trouver tout l'air (poumons + extérieur)
        thresh_img = np.where(img_norm < global_threshold, 1.0, 0.0)

        eroded = morphology.erosion(thresh_img, np.ones([3, 3]))
        eroded_dilation = morphology.dilation(eroded, np.ones([5, 5]))

        labels = measure.label(eroded_dilation)
        regions = measure.regionprops(labels)

        valid_regions = []

        for prop in regions:
            if prop.area < 200:
                continue

            region_mask = labels == prop.label

            if np.any(region_mask & fov_boundary):
                continue

            valid_regions.append(prop)

        # On trie par taille et on garde les 2 plus grandes poches internes (les poumons)
        valid_regions.sort(key=lambda x: x.area, reverse=True)
        final_labels = [r.label for r in valid_regions[:2]]

        slice_mask = np.zeros([row_size, col_size], dtype=np.int8)
        for N in final_labels:
            slice_mask += labels == N

        # Dilatation finale
        final_mask = morphology.dilation(slice_mask, np.ones([8, 8]))
        mask_3d[i] = final_mask

    # On labellise les composantes connexes en 3D
    labels_3d = measure.label(mask_3d)
    regions_3d = measure.regionprops(labels_3d)

    if len(regions_3d) > 0:
        # On trie par volume (aire en 3D)
        regions_3d.sort(key=lambda x: x.area, reverse=True)
        max_volume = regions_3d[0].area

        # On garde uniquement les composantes dont le volume représente au moins 5% du volume maximal
        valid_labels_3d = [r.label for r in regions_3d if r.area > max_volume * 0.05]

        mask_3d_clean = np.zeros_like(mask_3d, dtype=np.int8)
        for label in valid_labels_3d:
            mask_3d_clean += labels_3d == label

        mask_3d = mask_3d_clean

    return mask_3d.astype(bool)


def extract_radiomics_features(volume_3d, mask_3d):
    """
    Extracts radiomics features from the segmented lung volume.
    """
    logger.info("Extracting radiomics features from the segmented lung volume")
    lung_pixels = volume_3d[mask_3d]

    if len(lung_pixels) == 0:
        return [0.0, 0.0, 0.0, 0.0]

    # Volume total (chaque voxel rééchantillonné fait 1mm3 = 0.001 cm3)
    volume_cm3 = round(len(lung_pixels) * 0.001, 3)

    mean_hu = np.mean(lung_pixels)
    std_hu = np.std(lung_pixels)

    # Score de fibrose (ratio de tissus denses > -250 HU à l'intérieur du poumon)
    fibrosis_ratio = np.sum(lung_pixels > -250) / len(lung_pixels)

    return [volume_cm3, mean_hu, std_hu, float(fibrosis_ratio)]


def create_3d_file(mask_3d, output_path="lungs.glb", step_size=2):
    """
    Creates a 3D file (default extension .glb) from a 3D mask.
    """
    logger.info("Creating a 3D file from a 3D mask")
    if np.sum(mask_3d) == 0:
        logger.error("The 3D mask is empty. Unable to generate a mesh")
        return False

    logger.info("Generating a 3D mesh using the marching cubes algorithm")
    try:
        verts, faces, normals, values = measure.marching_cubes(
            mask_3d, step_size=step_size
        )
    except ValueError:
        logger.error("Mesh generation with marching cubes algorithm failed")
        return False

    mesh = trimesh.Trimesh(vertices=verts, faces=faces, vertex_normals=normals)
    mesh.export(output_path)
    logger.info(f"3D model saved to {output_path}")
    return True


def process_patient_segmentation(
    patient_id: int,
    zip_path: str,
    age: int,
    sex: str,
    smoking_status: str,
    height: float,
    fvc_baseline: float,
):
    """
    Main function to run the segmentation pipeline for a patient.
    Extracts the zip to a temporary folder, runs segmentation, and returns the volume and mask.
    """
    logger.info(f"Starting segmentation pipeline for patient {patient_id}")
    with tempfile.TemporaryDirectory() as tmpdirname:
        # 1. Unzip
        try:
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                zip_ref.extractall(tmpdirname)
            logger.info(f"Unzipped DICOM files for patient {patient_id}")
        except zipfile.BadZipFile:
            logger.error(f"Bad zip file for patient {patient_id}")
            return None, None

        # 2. Pipeline
        try:
            slices = load_and_sort_scan(patient_id, tmpdirname)
            if not slices:
                logger.error(f"No valid DICOM slices found for patient {patient_id}")
                return None, None

            hu_volume = get_pixels_hu(slices)
            resampled_volume = resample_volume(hu_volume, slices)
            mask_3d = generate_lung_mask(resampled_volume)

            # 3. Calculate Optimal FVC
            optimal_fvc = calculate_optimal_FVC(age, sex, height)
            logger.info(
                f"Calculated optimal FVC for patient {patient_id}: {optimal_fvc} liters"
            )

            # 4. Extract Features
            features = extract_radiomics_features(resampled_volume, mask_3d)

            # Abort if metrics are [0, 0, 0, 0]
            if features == [0.0, 0.0, 0.0, 0.0]:
                logger.error(
                    f"Segmentation failed (empty mask) for patient {patient_id}. Metrics are [0, 0, 0, 0]. Aborting."
                )
                return None, None

            lung_volume = features[0]
            mean_hu = features[1]
            std_hu = features[2]
            fibrosis_ratio = features[3]  # fibrosis ratio

            sickness_value = fvc_baseline / optimal_fvc if optimal_fvc > 0 else 0.0

            logger.info(
                f"Segmentation complete for patient {patient_id}. "
                f"Lung Volume: {lung_volume} cm3, Fibrosis Ratio: {fibrosis_ratio}, Sickness Value: {sickness_value}"
            )

            # 5. Generate 3D Model
            glb_path = f"{UPLOAD_DIR}/{patient_id}/lung.glb"
            if not create_3d_file(mask_3d, glb_path):
                glb_path = None
                logger.warning(f"Failed to generate 3D model for patient {patient_id}")

            # 6. Update Database & Run FVC Predictions
            conn = get_db_connection()
            try:
                db_update_patient_features(
                    conn,
                    patient_id,
                    lung_volume,
                    optimal_fvc,
                    mean_hu,
                    std_hu,
                    sickness_value,
                    fibrosis_ratio,
                    glb_path,
                )
                logger.info(f"Updated database with features for patient {patient_id}")

                # ML FVC Prediction
                model_dir = os.path.dirname(os.path.abspath(__file__))
                model_path = os.path.join(model_dir, "..", "models", "model_fvc.json")
                if os.path.exists(model_path):
                    logger.info(f"Loading FVC prediction model from {model_path}")
                    model_fvc = xgb.XGBRegressor()
                    model_fvc.load_model(model_path)

                    sex_male = 1 if sex == "M" else 0
                    smoking_ex_smoker = 1 if smoking_status == "Ex-smoker" else 0
                    smoking_never_smoked = 1 if smoking_status == "Never smoked" else 0

                    base_week = 0
                    base_percent = (
                        (fvc_baseline / optimal_fvc) * 100.0 if optimal_fvc > 0 else 0.0
                    )

                    prediction_rows = []
                    weeks = list(range(-12, 134))
                    for w in weeks:
                        weeks_delta = w - base_week
                        row = {
                            "Weeks": w,
                            "Age": age,
                            "Vol_Lung_cm3": lung_volume,
                            "Mean_HU": mean_hu,
                            "Std_HU": std_hu,
                            "Fibrosis_Ratio": fibrosis_ratio,
                            "Sex_Male": sex_male,
                            "SmokingStatus_Ex-smoker": smoking_ex_smoker,
                            "SmokingStatus_Never smoked": smoking_never_smoked,
                            "Base_Week": base_week,
                            "Base_FVC": fvc_baseline,
                            "Base_Percent": base_percent,
                            "Weeks_Delta": weeks_delta,
                        }
                        prediction_rows.append(row)

                    feature_cols = [
                        "Weeks",
                        "Age",
                        "Vol_Lung_cm3",
                        "Mean_HU",
                        "Std_HU",
                        "Fibrosis_Ratio",
                        "Sex_Male",
                        "SmokingStatus_Ex-smoker",
                        "SmokingStatus_Never smoked",
                        "Base_Week",
                        "Base_FVC",
                        "Base_Percent",
                        "Weeks_Delta",
                    ]
                    df_pred = pd.DataFrame(prediction_rows, columns=feature_cols)
                    preds_fvc = model_fvc.predict(df_pred)

                    fvc_records = []
                    for i, w in enumerate(weeks):
                        pred_ml = float(preds_fvc[i])
                        pred_liters = pred_ml / 1000.0

                        weeks_delta = w - base_week
                        sigma = 70 + 0.8 * abs(weeks_delta)
                        confidence = max(0.1, 1.0 - (sigma - 70) / 300.0)

                        fvc_records.append(
                            {
                                "week_num": w,
                                "fvc": pred_liters,
                                "confidence": confidence,
                            }
                        )

                    db_add_fvc_records(conn, patient_id, fvc_records)
                    logger.info(
                        f"FVC prediction records successfully saved for patient {patient_id}"
                    )
                else:
                    logger.error(f"FVC prediction model file not found at {model_path}")
            except Exception as e:
                logger.error(
                    f"Error running ML FVC prediction: {str(e)}", exc_info=True
                )
            finally:
                conn.close()

            return resampled_volume, mask_3d

        except Exception as e:
            logger.error(
                f"Pipeline error for patient {patient_id}: {str(e)}", exc_info=True
            )
            return None, None
