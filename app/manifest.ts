import type { MetadataRoute } from 'next'

// Web app manifest: "Add to Home Screen" opens Runway full screen
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Runway',
    short_name: 'Runway',
    description: 'Your loan, counted in days',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0B0D12',
    theme_color: '#0B0D12',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
