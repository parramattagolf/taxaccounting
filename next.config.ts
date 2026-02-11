import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vjpouwwgxopvbshmikxg.supabase.co',
      },
      {
        protocol: 'http',
        hostname: '**.kakaocdn.net',
      },
      {
        protocol: 'https',
        hostname: '**.kakaocdn.net',
      },
    ],
  },
};

export default nextConfig;
