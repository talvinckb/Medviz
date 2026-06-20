export interface HealthCheckResponse {
  status: string;
}

export interface FVCRecord {
  id: number;
  week_num: number;
  fvc: number;
  confidence: number;
  // ML Quantile predictions (in mL — same unit as fvc * 1000)
  q005?: number | null;
  q020?: number | null;
  q050?: number | null;
  q080?: number | null;
  q095?: number | null;
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
  smoking_status?: string | null;
  fvc_baseline?: number | null;
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
