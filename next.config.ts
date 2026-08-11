import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // Only pull in the specific icons/components actually imported, instead of
    // bundling the whole package — smaller bundles, faster builds.
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
