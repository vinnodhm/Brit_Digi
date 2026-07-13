/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost', port: '5000' },
      { protocol: 'https', hostname: '*.neon.tech' },
    ],
    domains: ['localhost'],
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  webpack(config) {
    // Fabric.js requires canvas — mark as external in server context
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push({ canvas: 'canvas' });
    }
    return config;
  },
};

module.exports = nextConfig;
