/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    // Only bypass in Vercel where vercel.json handles serverless routing. In self-hosted (dev or prod), proxy to FastAPI.
    if (!process.env.VERCEL) {
      const args = process.argv;
      const portIndex = args.indexOf('-p');
      const nextPort = portIndex !== -1 ? args[portIndex + 1] : null;
      const apiPort = nextPort === '3011' ? '8011' : (process.env.API_PORT || '8000');
      const lmsPort = process.env.LMS_PORT || '8080';
      
      return [
        {
          source: '/api/:path*',
          destination: `http://127.0.0.1:${apiPort}/api/:path*`,
        },
        {
          source: '/lms/:path*',
          destination: `http://127.0.0.1:${lmsPort}/:path*`,
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
