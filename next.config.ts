import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only use basePath and assetPrefix when BASE_PATH is explicitly set (for server deployment)
  ...(process.env.BASE_PATH && {
    basePath: process.env.BASE_PATH,
    assetPrefix: process.env.BASE_PATH,
  }),
  
  // Only use standalone output for server deployment (not Vercel)
  ...(process.env.DEPLOYMENT_TARGET === 'server' && {
    output: 'standalone',
    trailingSlash: true,
  }),
  
  // Environment-specific configuration
  env: {
    NEXT_PUBLIC_WARRANTY_API_URL: process.env.NEXT_PUBLIC_WARRANTY_API_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_API_TIMEOUT: process.env.NEXT_PUBLIC_API_TIMEOUT,
    NEXT_PUBLIC_API_RETRY_ATTEMPTS: process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS,
    NEXT_PUBLIC_DEBUG_API: process.env.NEXT_PUBLIC_DEBUG_API,
    CUSTOM_BASE_PATH: process.env.BASE_PATH || '',
  },
  
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    compress: true,
    poweredByHeader: false,
    generateEtags: false,
  }),
  
  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    reactStrictMode: true,
  }),
};

export default nextConfig;
