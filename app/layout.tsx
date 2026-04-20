import type {Metadata} from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import CommandPalette from '@/components/CommandPalette';
import { ThemeProvider } from '@/components/ThemeProvider';

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

export const metadata: Metadata = {
  title: 'LATAM Cargo - Gestão de Escalas',
  description: 'Sistema automatizado de gestão de escalas e colaboradores para LATAM Cargo Brasil.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SGEI LATAM',
  },
  icons: {
    apple: 'https://placehold.co/192x192/002169/ffffff?text=LATAM',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}>
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
