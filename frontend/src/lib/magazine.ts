export type MagCategory = { id: number; name: string; slug: string; description: string; order: number; article_count: number };
export type ArticleCard = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  cover: string | null;
  category: MagCategory;
  published_at: string;
  reading_minutes: number;
  is_featured: boolean;
  views: number;
  author: string;
};
export type ArticleDetail = ArticleCard & {
  body: string;
  specialties: { id: number; name: string; title: string; slug: string }[];
  conditions: { slug: string; name: string }[];
  reviewed_by: { short_id: string; slug: string; full_name: string; photo: string | null; gender: "male" | "female"; specialty: string } | null;
  seo_title: string;
  seo_description: string;
  updated_at: string;
};

const TONES = ["from-brand-500 to-brand-700", "from-violet-500 to-indigo-600", "from-amber-500 to-orange-600", "from-emerald-500 to-teal-600", "from-rose-500 to-pink-600", "from-sky-500 to-blue-600"];

export function categoryTone(cat: { id: number }) {
  return TONES[cat.id % TONES.length];
}
