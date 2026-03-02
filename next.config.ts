import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  reactStrictMode: false,
  serverExternalPackages: ["@parcel/watcher"],
  outputFileTracingExcludes: {
    "*": [
      "@parcel/watcher",
      "@parcel/watcher-linux-x64-glibc",
      "@parcel/watcher-darwin-arm64",
      "@parcel/watcher-win32-x64",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "**",
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
