/** @type {import('next').NextConfig} */
// Last build: 2026-07-08
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@bmi/shared'],
};

export default nextConfig;
