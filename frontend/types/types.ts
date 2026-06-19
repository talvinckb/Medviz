export interface HealthCheckResponse {
  status: string;
}

export interface FVCRecord {
  id: number;
  week_num: number;
  fvc: number;
  confidence: number;
}

export interface PatientDetail {
  id: number;
  name: string;
  age: number;
  gender: string;
  height: number;
  optimal_fvc: number | null;
  lung_volume: number | null;
  mean_hu: number | null;
  std_hu: number | null;
  sickness_value: number | null;
  fibrosis_ratio: number | null;
  zip_path: string;
  glb_path: string | null;
  fvc_records: FVCRecord[];
}

export interface Lung3D {}

export interface SlideData {
  slide_number: number;
  image_base64: string;
}
export interface Slices {
  patient_id: number;
  slices: SlideData[];
}
