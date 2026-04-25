import type {Metadata} from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import CommandPalette from '@/components/CommandPalette';
import { ThemeProvider } from '@/components/ThemeProvider';
import AppleSplash from '@/components/AppleSplash';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1B0088' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1120' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'LATAM Cargo - Gestão de Escalas',
  description: 'Sistema automatizado de gestão de escalas e colaboradores para LATAM Cargo Brasil.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SGEI LATAM',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}>
      <head>
        <AppleSplash />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <CommandPalette />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
