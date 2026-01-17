import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude sharp and imghash from client-side bundling
    // These are server-side only packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Handle WASM files properly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Ignore WASM files that cause issues
    config.module = {
      ...config.module,
      rules: [
        ...(config.module?.rules || []),
        {
          test: /\.wasm$/,
          type: "asset/resource",
        },
      ],
    };

    return config;
  },
  // Exclude sharp from being bundled (it's server-side only)
  serverExternalPackages: ["sharp", "imghash"],
  
  // Image optimization configuration
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
    ],
    // Cache images for 1 year (Discogs images don't change)
    minimumCacheTTL: 31536000,
    // Enable image optimization with modern formats
    formats: ["image/avif", "image/webp"],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
