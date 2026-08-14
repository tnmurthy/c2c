import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'services/**',
      'graphify/**',
      'graphify-out/**',
	  '.agents/**',
    ],
  },
];