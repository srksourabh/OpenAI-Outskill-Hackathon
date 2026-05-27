/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["read-excel-file", "unzipper"]
};

export default nextConfig;
