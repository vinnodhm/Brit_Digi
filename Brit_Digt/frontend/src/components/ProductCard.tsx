import Link from 'next/link';
import { Product } from '@/types';
import { CATEGORY_LABELS, FINISH_LABELS } from '@/lib/products';

const CATEGORY_ICONS: Record<string, string> = {
  business_card: '🪪',
  flyer:         '📄',
  label:         '🏷️',
  poster:        '🖼️',
  brochure:      '📋',
};

const CATEGORY_COLORS: Record<string, string> = {
  business_card: 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
  flyer:         'from-purple-500/20 to-purple-600/10 border-purple-500/20',
  label:         'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20',
  poster:        'from-rose-500/20 to-rose-600/10 border-rose-500/20',
  brochure:      'from-amber-500/20 to-amber-600/10 border-amber-500/20',
};

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const minPrice = Math.min(...product.pricing_tiers.map((t) => parseFloat(t.unit_price)));
  const icon     = CATEGORY_ICONS[product.category] ?? '🖨️';
  const colorCls = CATEGORY_COLORS[product.category] ?? 'from-white/5 to-white/2 border-white/10';

  return (
    <div className={`glass-card bg-gradient-to-br ${colorCls} border p-6 flex flex-col gap-4 hover:scale-[1.02] hover:shadow-glow transition-all duration-300 group`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorCls} flex items-center justify-center text-2xl border`}>
          {icon}
        </div>
        <span className="text-xs font-mono text-brand-gold bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
          {CATEGORY_LABELS[product.category]}
        </span>
      </div>

      {/* Info */}
      <div>
        <h3 className="text-lg font-display font-semibold text-white group-hover:text-brand-gold transition-colors">
          {product.name}
        </h3>
        <p className="text-white/50 text-sm mt-1 line-clamp-2">{product.description}</p>
      </div>

      {/* Specs */}
      <div className="grid grid-cols-2 gap-2 text-xs text-white/40">
        <div className="flex items-center gap-1.5">
          <span className="text-brand-gold/60">📐</span>
          <span>{product.width_mm}×{product.height_mm}mm</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-brand-gold/60">✨</span>
          <span>{FINISH_LABELS[product.paper_finish]}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-brand-gold/60">📦</span>
          <span>{product.paper_gsm}gsm</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-brand-gold/60">🔢</span>
          <span>Min. {product.min_quantity} pcs</span>
        </div>
      </div>

      <div className="gold-divider" />

      {/* Pricing & CTA */}
      <div className="flex items-end justify-between mt-auto">
        <div>
          <p className="text-white/40 text-xs">Starting from</p>
          <p className="text-2xl font-bold text-white">
            ₹{minPrice.toFixed(2)}
            <span className="text-sm font-normal text-white/40"> /pc</span>
          </p>
        </div>
        <Link
          href={`/product/${product.id}`}
          id={`configure-${product.id}`}
          className="btn-primary text-sm py-2.5 px-5"
        >
          Configure →
        </Link>
      </div>
    </div>
  );
}
