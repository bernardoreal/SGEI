import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gestão de Escalas LATAM',
    short_name: 'SGEI',
    description: 'Sistema Automatizado de Gestão de Escalas LATAM Cargo',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0B1120',
    theme_color: '#0B1120',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
