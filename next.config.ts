import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-pdf / pdfjs use browser-only APIs; keep them out of the Node SSR bundle.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
