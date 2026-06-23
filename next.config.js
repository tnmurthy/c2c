/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV !== 'production' 
          ? 'http://127.0.0.1:8011/api/:path*' 
          : '/api/main',
      },
    ];
  },
};

module.exports = nextConfig;
