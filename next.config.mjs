/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
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
