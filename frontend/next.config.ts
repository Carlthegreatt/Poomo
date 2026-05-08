import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Relative to this config file (`frontend/`); Turbopack requires relative aliases, not absolute. */
const nodeDomExceptionShimRelative = "../packages/native-domexception/index.mjs";
const nodeDomExceptionShimAbsolute = path.join(
  __dirname,
  nodeDomExceptionShimRelative,
);

const nextConfig: NextConfig = {
  /** Re-bundle JSX so dependencies use the same automatic JSX runtime as the app (React 19). */
  transpilePackages: ["react-big-calendar"],

  turbopack: {
    resolveAlias: {
      "node-domexception": nodeDomExceptionShimRelative,
    },
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "node-domexception": nodeDomExceptionShimAbsolute,
    };
    return config;
  },

  async headers() {
    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
      : "";

    const csp = [
      "default-src 'self'",
      `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
    ]
      .filter(Boolean)
      .join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
