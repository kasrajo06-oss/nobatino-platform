export type OfferCategoryKey = "dentistry" | "beauty" | "psychology" | "checkup" | "physio" | "nutrition" | "other";

export type Offer = {
  id: number;
  title: string;
  slug: string;
  category: OfferCategoryKey;
  category_display: string;
  summary: string;
  cover: string | null;
  original_price: number;
  price: number;
  discount_percent: number;
  provider_name: string;
  provider: { type: "doctor" | "center"; url: string; gender?: "male" | "female"; center_type?: string; photo: string | null; subtitle: string };
  city: { name: string; slug: string };
  sold_count: number;
  remaining: number | null;
  valid_days: number;
};

export type OfferDetail = Offer & { description: string; includes: string[]; terms: string; address: string; max_per_user: number };

export type PackageOrder = {
  id: number;
  package: Offer;
  status: "pending_payment" | "paid" | "used" | "cancelled" | "expired";
  status_display: string;
  voucher_code: string | null;
  price: number;
  paid_amount: number;
  refunded_amount: number;
  held_until: string | null;
  paid_at: string | null;
  expires_at: string | null;
  used_at: string | null;
  buyer_name: string;
  buyer_mobile: string;
  created_at: string;
};

export const OFFER_TONES: Record<string, string> = {
  dentistry: "from-sky-500 to-blue-600",
  beauty: "from-rose-500 to-pink-600",
  psychology: "from-violet-500 to-indigo-600",
  checkup: "from-emerald-500 to-teal-600",
  physio: "from-amber-500 to-orange-600",
  nutrition: "from-lime-500 to-green-600",
  other: "from-slate-500 to-slate-700",
};
