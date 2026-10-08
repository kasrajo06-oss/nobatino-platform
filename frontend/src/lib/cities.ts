import credits from "@/data/city-credits.json";

/** Cities with a bundled (freely licensed) photo; see /credits for attribution. */
export const CITY_IMAGES = new Set(Object.keys(credits));

export function cityImage(slug: string): string | null {
  return CITY_IMAGES.has(slug) ? `/images/cities/${slug}.jpg` : null;
}

export const CITY_CREDITS = credits as Record<string, { title: string; author: string; license: string; license_url: string; source: string }>;
