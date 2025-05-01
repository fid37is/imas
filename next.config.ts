/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  // Images must be configured for static exports
  images: {
    unoptimized: true,
  },
  // Use proper asset prefix format for static exports
  assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '',
  // No server-side functionality for static export
  experimental: {
    // Disable features that require server APIs
    serverComponents: false,
    serverActions: false,
  },
  // Configure env variables that should be exposed to the client
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_GOOGLE_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    NEXT_PUBLIC_GOOGLE_SPREADSHEET_ID: process.env.NEXT_PUBLIC_GOOGLE_SPREADSHEET_ID,
  }
};

module.exports = nextConfig;