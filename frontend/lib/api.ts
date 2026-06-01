import { HealthCheckResponse, Patient } from "@/types/types";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

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

export async function getPatients(): Promise<Patient[]> {
  try {
    const response = await fetch(`${API_URL}/patients`);
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
