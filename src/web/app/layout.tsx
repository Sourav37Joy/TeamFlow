import type { Metadata } from 'next';
import { IBM_Plex_Sans, Inter } from 'next/font/google';
import SessionNav from '../components/SessionNav';
import './globals.css';

// Self-hosted with swap and generated fallback metrics, so text is readable at first paint and
// does not reflow when the faces arrive (FR-111).
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-plexsans',
});

export const metadata: Metadata = {
  title: 'TeamFlow',
  description: 'Who is available, who is overloaded, and what breaks if you move someone.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plexSans.variable}`}>
      <body>
        <div className="shell">
          <nav className="nav">
            <h1>TeamFlow</h1>
            <SessionNav />
          </nav>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
