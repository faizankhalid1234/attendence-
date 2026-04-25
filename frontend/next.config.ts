import type { NextConfig } from "next";

/** Must match the Django server (see frontend/.env BACKEND_URL). Default 8000 = `manage.py runserver`. */
const backendBase = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: `${backendBase}/media/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "geolocation=(self), camera=(self), microphone=()",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
