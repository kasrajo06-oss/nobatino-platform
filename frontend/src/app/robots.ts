import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_STAGING === "true") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/panel", "/doctor-panel", "/center-panel", "/ops", "/booking", "/payment", "/login", "/api", "/orders", "/consult", "/notifications"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
