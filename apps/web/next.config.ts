import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@safe-meet/shared"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
