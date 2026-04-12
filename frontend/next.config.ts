import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Re-bundle JSX so dependencies use the same automatic JSX runtime as the app (React 19). */
  transpilePackages: ["react-big-calendar"],
};

export default nextConfig;
