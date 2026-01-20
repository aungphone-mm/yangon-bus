/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Static export for Vercel/Cloudflare
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
