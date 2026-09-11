import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.STATIC_EXPORT ? 'export' : undefined,
  serverExternalPackages: ["firebase-admin"],
  images: {
    unoptimized: process.env.STATIC_EXPORT ? true : false,
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'drive.google.com' },
    ],
  },
  pageExtensions: process.env.STATIC_EXPORT ? ['tsx', 'mdx'] : ['tsx', 'ts', 'jsx', 'js'],
};

export default nextConfig;
