'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: '/',          label: 'Products' },
    { href: '/checkout',  label: 'My Orders' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-brand-navy/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-brand-gold to-brand-gold-light shadow-brand">
              <span className="text-brand-navy font-display font-bold text-lg">B</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-white font-display font-semibold text-lg leading-tight group-hover:text-brand-gold transition-colors">
                Britannia
              </p>
              <p className="text-brand-gold text-xs font-mono tracking-widest -mt-0.5">DIGI PRINT</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors duration-200 ${
                  pathname === link.href
                    ? 'text-brand-gold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/" className="btn-primary text-sm py-2 px-5">
              Order Now
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            id="mobile-menu-btn"
            className="md:hidden text-white/70 hover:text-white p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className={`w-6 h-0.5 bg-current transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
            <div className={`w-6 h-0.5 bg-current mt-1.5 transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-6 h-0.5 bg-current mt-1.5 transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 py-4 px-4 space-y-3 bg-brand-navy/95">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-2 text-white/70 hover:text-white font-medium"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/" className="btn-primary w-full text-sm mt-2" onClick={() => setMenuOpen(false)}>
            Order Now
          </Link>
        </div>
      )}
    </nav>
  );
}
