/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow importing the shared workspace packages (TS source) directly.
  transpilePackages: ['@saf/ui', '@saf/types'],
  experimental: {
    typedRoutes: false,
  },
  // The shared TS packages use explicit ".js" import specifiers (required by the
  // API's NodeNext resolution). Teach webpack to resolve those to the ".ts"
  // sources so both toolchains can consume the same packages.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
