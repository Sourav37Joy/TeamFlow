import type { Metadata } from 'next';
import SessionNav from '../components/SessionNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'TeamFlow',
  description: 'Who is available, who is overloaded, and what breaks if you move someone.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
