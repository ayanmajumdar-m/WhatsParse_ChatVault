import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export static HTML for use with Capacitor (output directory: out/)
  output: "export",
  // Ensure trailing slashes for consistent asset paths in static export
  trailingSlash: true,
  // Allow Android/WebView dev hosts to reach Next.js HMR during development.
  allowedDevOrigins: ["12.022.654.306"],
};

export default nextConfig;
