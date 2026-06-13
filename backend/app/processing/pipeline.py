import os
import tempfile
import zipfile

import numpy as np
import pydicom
import scipy
from app.database import get_db_connection, UPLOAD_DIR
from app.services import db_update_patient_features
from skimage import measure, morphology
from sklearn.cluster import KMeans
import trimesh


def load_and_sort_scan(patient_id, base_dir):
    """
    Loads DICOM files from a directory and sorts them spatially.
    """
    filenames = os.listdir(base_dir)
    slices = []
    for f in filenames:
        path = os.path.join(base_dir, f)
        try:
            dicom_slice = pydicom.dcmread(path)
            # Anonymize
            dicom_slice.PatientName = "ANONYMOUS"
            dicom_slice.PatientID = str(patient_id)
            slices.append(dicom_slice)
        except Exception:
            # Ignore non-dicom files
            pass

    # Sort using physical Z coordinate instead of InstanceNumber for safety
    slices.sort(key=lambda x: float(x.ImagePositionPatient[2]))
    return slices


def get_pixels_hu(slices):
    """
    Converts pixel arrays to Hounsfield Units (HU).
    """
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
    try:
        z_spacing = np.abs(
            slices[0].ImagePositionPatient[2] - slices[1].ImagePositionPatient[2]
        )
    except AttributeError:
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

        thresh_img = np.where(img_norm < global_threshold, 1.0, 0.0)

        eroded = morphology.erosion(thresh_img, np.ones([3, 3]))
        eroded_dilation = morphology.dilation(eroded, np.ones([5, 5]))

        labels = measure.label(eroded_dilation)
        regions = measure.regionprops(labels)
        good_labels = []

        for prop in regions:
            B = prop.bbox
            if (
                (B[2] - B[0] < row_size / 10 * 9)
                and (B[3] - B[1] < col_size / 10 * 9)
                and (B[0] > row_size / 5)
                and (B[2] < col_size / 5 * 4)
            ):
                good_labels.append(prop.label)

        slice_mask = np.zeros([row_size, col_size], dtype=np.int8)
        for N in good_labels:
            slice_mask += labels == N

        final_mask = morphology.dilation(slice_mask, np.ones([8, 8]))
        mask_3d[i] = final_mask

    return mask_3d.astype(bool)


def extract_radiomics_features(volume_3d, mask_3d):
    """
    Extracts radiomics features from the segmented lung volume.
    """
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
    Crée un fichier 3D (par défaut .glb) à partir d'un masque 3D.
    """
    if np.sum(mask_3d) == 0:
        print("Erreur: Le masque 3D est vide. Impossible de générer un maillage.")
        return False

    print("Génération du maillage 3D avec marching cubes...")
    try:
        verts, faces, normals, values = measure.marching_cubes(
            mask_3d, step_size=step_size
        )
    except ValueError as e:
        print(f"Erreur lors de la génération du maillage: {e}")
        return False

    mesh = trimesh.Trimesh(vertices=verts, faces=faces, vertex_normals=normals)
    mesh.export(output_path)
    print(f"Modèle 3D sauvegardé sous {output_path}")
    return True


def process_patient_segmentation(patient_id: int, zip_path: str):
    """
    Main function to run the segmentation pipeline for a patient.
    Extracts the zip to a temporary folder, runs segmentation, and returns the volume and mask.
    """
    print(f"Starting segmentation pipeline for patient {patient_id}...")
    with tempfile.TemporaryDirectory() as tmpdirname:
        # 1. Unzip
        try:
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                zip_ref.extractall(tmpdirname)
        except zipfile.BadZipFile:
            print(f"Error: Bad zip file for patient {patient_id}")
            return None, None

        # 2. Pipeline
        try:
            slices = load_and_sort_scan(patient_id, tmpdirname)
            if not slices:
                print(f"Error: No valid DICOM slices found for patient {patient_id}")
                return None, None

            hu_volume = get_pixels_hu(slices)
            resampled_volume = resample_volume(hu_volume, slices)
            mask_3d = generate_lung_mask(resampled_volume)

            # 3. Extract Features
            features = extract_radiomics_features(resampled_volume, mask_3d)
            lung_volume = features[0]
            mean_hu = features[1]
            std_hu = features[2]
            sickness_value = features[3]  # fibrosis ratio

            print(
                f"Segmentation complete for patient {patient_id}. Lung Volume: {lung_volume} cm3, Fibrosis Ratio: {sickness_value}"
            )

            # 4. Generate 3D Model
            glb_path = f"{UPLOAD_DIR}/{patient_id}/lung.glb"
            if not create_3d_file(mask_3d, glb_path):
                glb_path = None

            # 5. Update Database
            conn = get_db_connection()
            try:
                db_update_patient_features(
                    conn,
                    patient_id,
                    lung_volume,
                    mean_hu,
                    std_hu,
                    sickness_value,
                    glb_path,
                )
            finally:
                conn.close()

            return resampled_volume, mask_3d

        except Exception as e:
            print(f"Pipeline error for patient {patient_id}: {str(e)}")
            return None, None
