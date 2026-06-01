export interface HealthCheckResponse {
  status: string;
}

export interface FCV_Data {
  fvc: number;
  week_num: number;
  confidence: number;
}

export interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  fcv_data: FCV_Data[];

  lung_volume: number;
  sickness_value: number;
}

// to see how we communicate with the backend the 3d model
export interface Lung3D {}

export interface SlideData {
  slide_number: number;
  image_base64: string;
}
export interface Slices {
  patient_id: number;
  slices: SlideData[];
}
