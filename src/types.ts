export interface RawPatientRecord {
  patient_id: string;
  first_name: string;
  last_name: string;
  dob: string;
  email?: string;
  phone?: string;
  account_balance: string;
  last_modified: string;
}

export interface NormalizedPatientRecord {
  patient_id: string;
  first_name: string;
  last_name: string;
  dob: string;
  email: string | null;
  phone: string | null;
  account_balance: number;
  last_modified: string;
}