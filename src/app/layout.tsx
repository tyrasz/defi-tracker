import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DeFi Tracker',
  description: 'Track your DeFi positions and find yield opportunities',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-white">
              DeFi Tracker
            </a>
            <nav className="flex gap-4 text-sm text-gray-400">
              <a href="/" className="hover:text-white transition-colors">
                Home
              </a>
              <a
                href="/api/v1/health"
                className="hover:text-white transition-colors"
              >
                API Status
              </a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
