import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Enables forbidden() → app/forbidden.tsx (403) for ownership checks.
    authInterrupts: true,
    // Excel/CSV imports go through server actions (default limit is 1 MB).
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
