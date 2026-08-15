/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    // Only rewrite in development. In production, vercel.json handles routing /api/* to the serverless function.
    if (process.env.NODE_ENV !== 'production') {
      const args = process.argv;
      const portIndex = args.indexOf('-p');
      const nextPort = portIndex !== -1 ? args[portIndex + 1] : null;
      const apiPort = nextPort === '3011' ? '8011' : '8000';
      
      return [
        {
          source: '/api/:path*',
          destination: `http://127.0.0.1:${apiPort}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
