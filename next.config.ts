import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.discogs.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.discogs.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "st.discogs.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lastfm.freetls.fastly.net",
        pathname: "/**",
      },
    ],
    minimumCacheTTL: 31536000,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
