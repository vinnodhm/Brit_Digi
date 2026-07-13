import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: {
    template: '%s | Britannia Digi Print',
    default: 'Britannia Digi Print — Premium Web-to-Print Platform',
  },
  description:
    'Design and order premium 2D print products online — Business Cards, Flyers, and Labels with same-day dispatch. Professional quality, delivered across India.',
  keywords: ['web to print', 'business cards', 'flyers', 'labels', 'online printing', 'India', 'Britannia Digi Print'],
  openGraph: {
    title: 'Britannia Digi Print',
    description: 'Premium online printing — Business Cards, Flyers, Labels. Design. Print. Deliver.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <footer className="border-t border-white/10 mt-24 py-10 text-center text-white/40 text-sm">
          <p>© {new Date().getFullYear()} Britannia Digi Print. All rights reserved.</p>
          <p className="mt-1">Premium Web-to-Print Platform — Crafted with ❤️ in India</p>
        </footer>
      </body>
    </html>
  );
}
