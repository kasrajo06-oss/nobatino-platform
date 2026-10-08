import "server-only";
import { serverGet } from "./server-api";

export type HomeData = {
  cities: { id: number; name: string; slug: string; doctor_count: number }[];
  specialties: { id: number; name: string; title: string; slug: string; icon: string; is_popular: boolean; doctor_count: number; online_count: number }[];
  conditions: { slug: string; name: string; is_popular: boolean }[];
  center_types: { type: string; label: string; count: number }[];
  testimonials: { author: string; text: string; rating: number; doctor: string; doctor_url: string }[];
  online_now: number;
};

export async function getHome(): Promise<HomeData | null> {
  try {
    return await serverGet<HomeData>("/home/", { revalidate: 300 });
  } catch {
    return null;
  }
}
