/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  server: {
    host: 'localhost',
    port: 3000
  }
}

module.exports = nextConfig