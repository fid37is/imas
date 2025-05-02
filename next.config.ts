/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // Configure images for SSR (server-side rendering)
  },
  assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '', // Configure asset prefix for SSR
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_GOOGLE_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    NEXT_PUBLIC_GOOGLE_SPREADSHEET_ID: process.env.NEXT_PUBLIC_GOOGLE_SPREADSHEET_ID,
  }
};

module.exports = nextConfig;
