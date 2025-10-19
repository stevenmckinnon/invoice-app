import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WWE Invoice App - Professional Invoice Management',
    short_name: 'WWE Invoice',
    description: 'Create and manage professional invoices for WWE freelancers and production staff',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    icons: [
      {
        src: '/favicon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['business', 'finance', 'productivity'],
    shortcuts: [
      {
        name: 'New Invoice',
        short_name: 'New',
        description: 'Create a new invoice',
        url: '/invoices/new',
        icons: [{ src: '/favicon-96x96.png', sizes: '96x96' }],
      },
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'View your dashboard',
        url: '/',
        icons: [{ src: '/favicon-96x96.png', sizes: '96x96' }],
      },
    ],
  }
}
