import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.keepercoating.jp',
      },
    ],
  },
};

export default nextConfig;
