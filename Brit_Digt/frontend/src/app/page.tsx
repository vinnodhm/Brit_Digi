import type { Metadata } from 'next';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { MOCK_PRODUCTS } from '@/lib/products';

export const metadata: Metadata = {
  title: 'Premium Print Products — Business Cards, Flyers & Labels',
  description: 'Order premium 2D print products online. Design custom Business Cards, Flyers, and Labels with our interactive design studio. Fast delivery across India.',
};

const STATS = [
  { value: '10,000+', label: 'Happy Customers' },
  { value: '48hr',    label: 'Turnaround' },
  { value: '99.8%',   label: 'Quality Pass Rate' },
  { value: '25+',     label: 'Cities Served' },
];

const FEATURES = [
  { icon: '🎨', title: 'Design Online', desc: 'Use our Fabric.js studio to drag-and-drop text and images on your product canvas.' },
  { icon: '🖨️', title: 'Print Ready PDF', desc: 'We generate a CMYK PDF/X with 3mm bleed automatically from your design.' },
  { icon: '🚚', title: 'Pan-India Delivery', desc: 'Same-day dispatch from our Mumbai facility to any Indian PIN code.' },
  { icon: '✅', title: 'Preflighting', desc: 'Every file is automatically checked for resolution, bleed, and safe zones before printing.' },
];

export default function HomePage() {
  const categories = ['business_card', 'flyer', 'label'] as const;

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 md:py-36 px-4">
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-brand-gold/5 blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-transparent to-brand-gold/30" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-sm font-medium mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
            India&apos;s Premium Web-to-Print Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-bold text-white leading-tight mb-6 animate-fade-up">
            Print that{' '}
            <span className="text-gold-gradient">Commands</span>
            <br />Attention
          </h1>

          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 animate-fade-up animate-delay-100">
            Design custom Business Cards, Flyers, and Labels online. Our studio converts
            your design into print-ready PDF/X with CMYK and 3mm bleed — automatically.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up animate-delay-200">
            <a href="#catalog" className="btn-primary text-base px-8 py-4">
              Browse Products ↓
            </a>
            <Link href="/design-studio/mock-bc-1" className="btn-secondary text-base px-8 py-4">
              Try Design Studio
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        <div className="max-w-4xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-up animate-delay-300">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center glass-card p-5">
              <p className="text-3xl font-bold text-gold-gradient">{stat.value}</p>
              <p className="text-white/50 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Product Catalog ────────────────────────────────────────── */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-14">
          <h2 className="section-heading">
            Our <span>Print Products</span>
          </h2>
          <p className="text-white/50 mt-3 max-w-xl mx-auto">
            Premium paper products for every business need. All products include free design assistance.
          </p>
          <div className="gold-divider max-w-24 mx-auto mt-6" />
        </div>

        {/* Category groups */}
        {categories.map((category) => {
          const categoryProducts = MOCK_PRODUCTS.filter((p) => p.category === category);
          if (categoryProducts.length === 0) return null;

          const categoryLabel: Record<string, string> = {
            business_card: 'Business Cards',
            flyer: 'Flyers',
            label: 'Labels',
          };

          return (
            <div key={category} className="mb-14">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-7 rounded-full bg-brand-gold" />
                <h3 className="text-xl font-display font-semibold text-white">
                  {categoryLabel[category]}
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* ── How It Works ──────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-heading">
              How It <span>Works</span>
            </h2>
            <p className="text-white/50 mt-3">From design to doorstep in 4 simple steps.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="glass-card p-6 text-center relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center text-brand-gold text-xs font-bold">
                  {i + 1}
                </div>
                <div className="text-4xl mb-4 mt-2">{f.icon}</div>
                <h4 className="text-white font-semibold mb-2">{f.title}</h4>
                <p className="text-white/40 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
