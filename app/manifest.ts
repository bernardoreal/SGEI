import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LATAM SGEI - Gestão de Escalas',
    short_name: 'LATAM SGEI',
    description: 'Sistema de Gestão de Escalas Integrada - LATAM Cargo',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#002169',
    icons: [
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  };
}
