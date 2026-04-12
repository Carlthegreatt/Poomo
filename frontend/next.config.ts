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
};

export default nextConfig;
