import path from "node:path";
import type { NextConfig } from "next";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_INTERNAL_URL}/api/:path*` },
      { source: "/media/:path*", destination: `${API_INTERNAL_URL}/media/:path*` },
      // only reached without nginx in front (single-container demo); nginx routes these itself
      { source: "/admin/:path*", destination: `${API_INTERNAL_URL}/admin/:path*` },
      { source: "/static/:path*", destination: `${API_INTERNAL_URL}/static/:path*` },
    ];
  },
};

export default nextConfig;
