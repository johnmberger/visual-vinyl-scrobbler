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
};

export default nextConfig;
