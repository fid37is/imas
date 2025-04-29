// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig: import('next').NextConfig = {
  output: 'export',  // Static export for Firebase hosting
  images: {
    unoptimized: true, // Required for static export
  },
  trailingSlash: true, // Helps with clean URLs in static export
  distDir: 'out', // Specify output directory explicitly
};

export default nextConfig;