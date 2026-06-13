import { HealthCheckResponse, PatientDetail } from "@/types/types";

export const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function healthCheck(): Promise<HealthCheckResponse> {
  try {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed with status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error during health check:", error);
    throw error;
  }
}

export async function getPatients(): Promise<number[]> {
  try {
    const response = await fetch(`${API_URL}/patients/`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch patients with status: ${response.status}`,
      );
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching patients:", error);
    throw error;
  }
}

export async function getPatientData(
  patientId: number,
): Promise<PatientDetail> {
  try {
    const response = await fetch(`${API_URL}/patients/${patientId}/data`);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch patient data with status: ${response.status}`,
      );
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data for patient ${patientId}:`, error);
    throw error;
  }
}

export async function uploadPatient(
  formData: FormData,
): Promise<PatientDetail> {
  try {
    const response = await fetch(`${API_URL}/patients/upload`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Upload failed: ${errorData.detail || response.statusText}`,
      );
    }
    return await response.json();
  } catch (error) {
    console.error("Error uploading patient:", error);
    throw error;
  }
}

export async function deletePatient(
  patientId: number,
): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_URL}/patients/${patientId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(
        `Failed to delete patient with status: ${response.status}`,
      );
    }
    return await response.json();
  } catch (error) {
    console.error(`Error deleting patient ${patientId}:`, error);
    throw error;
  }
}
