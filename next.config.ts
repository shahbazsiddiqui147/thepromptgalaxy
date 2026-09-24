import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  serverExternalPackages: ['pg', 'sharp'],
}

export default nextConfig
