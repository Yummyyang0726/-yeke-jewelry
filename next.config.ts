import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow serving uploaded images from public/uploads
  // Uploaded images are stored in public/uploads/{orderId}/
  // and served as static files automatically by Next.js

  // Increase body size limit for image uploads (default is based on deployment)
  // For self-hosted: handled at the server level (nginx/pm2)
}

export default nextConfig
