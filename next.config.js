/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '10ampro-hub.vercel.app' },
    ],
  },
};

module.exports = nextConfig;
