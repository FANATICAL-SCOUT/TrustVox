/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/create-form',
        destination: '/client/create',
        permanent: false,
      },
      {
        source: '/my-forms',
        destination: '/client/forms',
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
