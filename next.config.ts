import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    PROVIDER_URL: process.env.PROVIDER_URL
  }
};

export default nextConfig;
