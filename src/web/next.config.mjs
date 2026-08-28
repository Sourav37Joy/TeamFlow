import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pinned to this repository. Without it Next walks up and finds an unrelated
  // package-lock.json in the user profile, then treats that as the workspace root.
  outputFileTracingRoot: join(here, '..', '..'),
};

export default nextConfig;
