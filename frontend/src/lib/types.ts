export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export type City = { id: number; name: string; slug: string; province: number; province_name: string; lat: string | null; lng: string | null; is_popular: boolean };
export type Province = { id: number; name: string; slug: string };
export type SpecialtyMini = { id: number; name: string; title: string; slug: string };
export type Specialty = SpecialtyMini & { icon: string; parent: number | null; is_popular: boolean; description: string; children: SpecialtyMini[] };
export type Condition = { id: number; name: string; slug: string; is_popular: boolean; description: string; specialties: SpecialtyMini[] };
export type Insurance = { id: number; name: string; slug: string; kind: "basic" | "supplementary"; logo: string | null };
export type Degree = { id: number; name: string; slug: string };
export type Badge = { key: string; label: string };
export type ConsultType = "in_person" | "phone" | "text" | "video";

export type DoctorCard = {
  id: number;
  short_id: string;
  slug: string;
  full_name: string;
  first_name: string;
  last_name: string;
  gender: "male" | "female";
  photo: string | null;
  degree: string;
  primary_specialty: SpecialtyMini;
  specialties: SpecialtyMini[];
  rating_avg: string;
  review_count: number;
  recommend_pct: number;
  successful_appointments: number;
  endorsement_count: number;
  avg_wait_minutes: number | null;
  first_free_slot_at: string | null;
  badges: Badge[];
  consult_types: ConsultType[];
  main_office: { id: number; city: string; city_slug: string; address: string; visit_fee: number } | null;
  offices_count: number;
  insurances: string[];
  offers_instant: boolean;
  consult_services: import("./consult").ConsultService[];
  available_now: boolean;
  first_online_slot_at: string | null;
};

export type Office = {
  id: number;
  title: string;
  city: City;
  address: string;
  lat: string | null;
  lng: string | null;
  phone: string;
  insurances: Insurance[];
  visit_fee: number;
  booking_fee: number;
  booking_enabled: boolean;
  notes: string;
  center_name: string | null;
  center_slug: string | null;
};

export type DoctorDetail = Omit<DoctorCard, "degree"> & {
  degree: Degree;
  bio: string;
  medical_council_no: string;
  offices: Office[];
  endorsers: { short_id: string; slug: string; full_name: string; photo: string | null; specialty: string; gender: "male" | "female" }[];
  experience_years: number | null;
  offers_phone: boolean;
  offers_text: boolean;
  offers_video: boolean;
};

export type Review = {
  id: number;
  author: string;
  rating: number;
  recommends: boolean;
  wait_minutes: number | null;
  wait_display: string | null;
  text: string;
  reply: string;
  created_at: string;
};

export type CenterType = "hospital" | "clinic" | "darmangah" | "laboratory" | "imaging" | "pharmacy";

export type CenterCard = {
  id: number;
  slug: string;
  type: CenterType;
  type_display: string;
  name: string;
  city: City;
  address: string;
  phone: string;
  logo: string | null;
  is_24h: boolean;
  is_public_sector: boolean;
  has_home_sampling: boolean;
  online_reception: boolean;
  rating_avg: string;
  review_count: number;
  first_free_slot_at: string | null;
};

export type CenterLabTest = { id: number; test_id: number; name: string; en_name: string; category: string; fasting_hours: number; preparation: string; price: number };

export type CenterDetail = CenterCard & {
  lat: string | null;
  lng: string | null;
  website: string;
  description: string;
  cover: string | null;
  working_hours: string;
  insurances: Insurance[];
  specialties: SpecialtyMini[];
  reception_fee: number;
  home_sampling_fee: number;
  lab_tests: CenterLabTest[];
  doctors: { short_id: string; slug: string; full_name: string; photo: string | null; specialty: string; rating_avg: string; gender: "male" | "female" }[];
};

export type DayAvailability = { date: string; jalali: string; weekday: string; day: number; month: string; free: number };
export type SlotItem = { id: number; start: string; time: string; remaining: number };

export type User = {
  id: number;
  mobile: string;
  first_name: string;
  last_name: string;
  full_name: string;
  national_code: string;
  gender: "male" | "female" | "";
  birth_date: string | null;
  email: string;
  insurance: number | null;
  insurance_name: string | null;
  role: "patient" | "doctor" | "center_staff" | "operator" | "superadmin";
  profile_completed: boolean;
  has_doctor_profile: boolean;
  center_ids: number[];
  date_joined: string;
};

export type FamilyMember = {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  national_code: string;
  gender: "male" | "female";
  birth_date: string | null;
  relation: string;
};

export type AppointmentStatus = "pending_payment" | "confirmed" | "attended" | "no_show" | "cancelled" | "expired";

export type Appointment = {
  id: number;
  tracking_code: string;
  kind: string;
  kind_display: string;
  status: AppointmentStatus;
  status_display: string;
  start: string;
  provider_name: string;
  provider_url: string | null;
  specialty: string;
  address: string;
  phone: string;
  patient_name: string;
  patient_national_code: string;
  patient_mobile: string;
  price: number;
  paid_amount: number;
  refunded_amount: number;
  held_until: string | null;
  patient_note: string;
  cancel_reason: string;
  can_cancel: boolean;
  can_review: boolean;
  lab_reception: null | {
    tests: { id: number; name: string }[];
    prescription: string | null;
    has_insurance_prescription: boolean;
    home_sampling: boolean;
    home_address: string;
    estimated_price: number;
    status: string;
    status_display: string;
    result_file: string | null;
  };
  is_online: boolean;
  consult_state: "waiting" | "active" | "closed" | null;
  created_at: string;
};

export type WalletTx = { id: number; amount: number; balance_after: number; kind: string; kind_display: string; description: string; created_at: string };

export type Suggest = {
  doctors: { short_id: string; slug: string; full_name: string; specialty: string; photo: string | null }[];
  specialties: { slug: string; name: string }[];
  conditions: { slug: string; name: string }[];
  centers: { slug: string; name: string; type: string; city: string }[];
};
