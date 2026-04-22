import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '叶客金匠 回购登记',
    short_name: '叶客金匠',
    description: '旧金回购登记系统',
    start_url: '/recycle/new',
    display: 'standalone',
    background_color: '#D4A574',
    theme_color: '#D4A574',
    lang: 'zh-CN',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
