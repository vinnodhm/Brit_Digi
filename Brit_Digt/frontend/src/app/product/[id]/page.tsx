'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PricingTable from '@/components/PricingTable';
import { MOCK_PRODUCTS, FINISH_LABELS, CATEGORY_LABELS } from '@/lib/products';
import { Product, PricingTier } from '@/types';

export default function ProductPage() {
  const params  = useParams<{ id: string }>();
  const router  = useRouter();
  const [product, setProduct]         = useState<Product | null>(null);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    // Fetch from API, fall back to mock data
    const load = async () => {
      try {
        const res  = await fetch(`/api/products/${params.id}`);
        const json = await res.json();
        if (json.success) {
          setProduct(json.data);
          setSelectedTier(json.data.pricing_tiers?.[0] ?? null);
          return;
        }
      } catch {
        // API unavailable — use mock
      }
      const mock = MOCK_PRODUCTS.find((p) => p.id === params.id);
      if (mock) {
        setProduct(mock);
        setSelectedTier(mock.pricing_tiers[0]);
      }
      setLoading(false);
    };
    load().finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-white/60 text-xl">Product not found.</p>
        <Link href="/" className="btn-primary">← Back to Catalog</Link>
      </div>
    );
  }

  const handleDesignNow = () => {
    if (!selectedTier) return;
    // Store selection in session storage for design studio
    sessionStorage.setItem('selectedProduct', JSON.stringify(product));
    sessionStorage.setItem('selectedTier', JSON.stringify(selectedTier));
    router.push(`/design-studio/${product.id}`);
  };

  const handleAddToCart = () => {
    if (!selectedTier) return;
    sessionStorage.setItem('selectedProduct', JSON.stringify(product));
    sessionStorage.setItem('selectedTier', JSON.stringify(selectedTier));
    router.push('/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-white/40 mb-10">
        <Link href="/" className="hover:text-white transition-colors">Products</Link>
        <span>/</span>
        <span className="text-brand-gold">{CATEGORY_LABELS[product.category]}</span>
        <span>/</span>
        <span className="text-white/60 truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* ── Left: Product Visual ──────────────────────────────── */}
        <div>
          <div className="glass-card p-10 flex items-center justify-center aspect-video relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/5 to-transparent" />

            {/* Product preview card */}
            <div
              className="relative z-10 bg-white/90 rounded-xl shadow-2xl flex items-center justify-center"
              style={{
                width:  `${Math.min(parseFloat(product.width_mm)  * 1.8, 320)}px`,
                height: `${Math.min(parseFloat(product.height_mm) * 1.8, 200)}px`,
                maxWidth: '100%',
              }}
            >
              {/* Bleed indicator */}
              <div
                className="absolute inset-0 border-2 border-dashed border-red-400/60 rounded-xl pointer-events-none"
                title="Bleed Zone"
              />
              {/* Safe zone indicator */}
              <div
                className="absolute border border-dashed border-green-400/60 rounded-lg pointer-events-none"
                style={{ inset: `${parseFloat(product.bleed_mm) * 1.8}px` }}
                title="Safe Zone"
              />
              <div className="text-center p-4">
                <p className="text-brand-navy/30 text-xs font-mono">YOUR DESIGN HERE</p>
                <p className="text-brand-navy/20 text-xs mt-1">
                  {product.width_mm}×{product.height_mm}mm
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 text-xs text-white/50">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border-t-2 border-dashed border-red-400/70" />
                <span>Bleed ({product.bleed_mm}mm)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border-t border-dashed border-green-400/70" />
                <span>Safe Zone</span>
              </div>
            </div>
          </div>

          {/* Spec badges */}
          <div className="flex flex-wrap gap-3 mt-4">
            {[
              { label: 'Paper', value: `${product.paper_gsm}gsm` },
              { label: 'Finish', value: FINISH_LABELS[product.paper_finish] },
              { label: 'Bleed',  value: `${product.bleed_mm}mm` },
              { label: 'Size',   value: `${product.width_mm}×${product.height_mm}mm` },
            ].map((spec) => (
              <div key={spec.label} className="glass-card px-4 py-2 text-sm">
                <span className="text-white/40">{spec.label}: </span>
                <span className="text-white font-medium">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Configuration ──────────────────────────────── */}
        <div className="space-y-8">
          <div>
            <span className="text-xs font-mono text-brand-gold bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
              {CATEGORY_LABELS[product.category]}
            </span>
            <h1 className="text-3xl font-display font-bold text-white mt-3 mb-2">
              {product.name}
            </h1>
            <p className="text-white/50">{product.description}</p>
          </div>

          <div className="gold-divider" />

          {/* Pricing table */}
          <PricingTable
            tiers={product.pricing_tiers}
            onSelect={setSelectedTier}
            selectedQuantity={selectedTier?.quantity}
          />

          <div className="gold-divider" />

          {/* CTAs */}
          <div className="space-y-3">
            <button
              id="design-now-btn"
              onClick={handleDesignNow}
              disabled={!selectedTier}
              className="btn-primary w-full text-base py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎨 Design Now in Studio
            </button>
            <button
              id="add-to-cart-btn"
              onClick={handleAddToCart}
              disabled={!selectedTier}
              className="btn-secondary w-full text-base py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🛒 Add to Cart & Checkout
            </button>
          </div>

          {/* Trust signals */}
          <div className="grid grid-cols-3 gap-3 text-center text-xs text-white/40 pt-2">
            <div className="glass-card p-3">
              <div className="text-xl mb-1">🔒</div>
              <p>Secure Payments</p>
            </div>
            <div className="glass-card p-3">
              <div className="text-xl mb-1">📦</div>
              <p>48hr Dispatch</p>
            </div>
            <div className="glass-card p-3">
              <div className="text-xl mb-1">↩️</div>
              <p>Quality Guarantee</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
