'use client';

import { useState } from 'react';
import { PricingTier } from '@/types';

interface PricingTableProps {
  tiers: PricingTier[];
  onSelect: (tier: PricingTier) => void;
  selectedQuantity?: number;
}

export default function PricingTable({ tiers, onSelect, selectedQuantity }: PricingTableProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!tiers || tiers.length === 0) {
    return <p className="text-white/40 text-sm">No pricing tiers available.</p>;
  }

  const sortedTiers = [...tiers].sort((a, b) => a.quantity - b.quantity);
  const maxQty = Math.max(...sortedTiers.map((t) => t.quantity));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Select Quantity</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {sortedTiers.map((tier) => {
          const isSelected = selectedQuantity === tier.quantity;
          const isHovered  = hovered === tier.quantity;
          const savings    = sortedTiers[0]
            ? (((parseFloat(sortedTiers[0].unit_price) - parseFloat(tier.unit_price)) / parseFloat(sortedTiers[0].unit_price)) * 100).toFixed(0)
            : '0';

          return (
            <button
              key={tier.quantity}
              id={`tier-${tier.quantity}`}
              onClick={() => onSelect(tier)}
              onMouseEnter={() => setHovered(tier.quantity)}
              onMouseLeave={() => setHovered(null)}
              className={`relative p-4 rounded-2xl border text-left transition-all duration-300 focus:outline-none ${
                isSelected
                  ? 'border-brand-gold bg-brand-gold/10 shadow-brand'
                  : 'border-white/10 bg-white/3 hover:border-brand-gold/40 hover:bg-white/6'
              }`}
            >
              {/* Best value badge */}
              {tier.quantity === maxQty && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-gold text-brand-navy text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                  Best Value
                </div>
              )}

              <p className="text-2xl font-bold text-white">{tier.quantity.toLocaleString()}</p>
              <p className="text-xs text-white/40 mt-0.5">pieces</p>

              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-brand-gold font-semibold text-base">
                  ₹{parseFloat(tier.unit_price).toFixed(2)}
                  <span className="text-white/40 text-xs font-normal">/pc</span>
                </p>
                <p className="text-white/50 text-xs mt-0.5">
                  Total: ₹{parseFloat(tier.total_price).toFixed(2)}
                </p>
              </div>

              {parseFloat(savings) > 0 && (
                <div className="mt-2">
                  <span className="text-emerald-400 text-xs font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full">
                    Save {savings}%
                  </span>
                </div>
              )}

              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-gold flex items-center justify-center">
                  <svg className="w-3 h-3 text-brand-navy" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Price summary bar */}
      {selectedQuantity && (
        <div className="mt-4 p-4 rounded-xl bg-brand-gold/5 border border-brand-gold/20 flex justify-between items-center animate-fade-in">
          <div>
            <p className="text-white/60 text-sm">Order Total</p>
            <p className="text-white font-semibold text-lg">
              {selectedQuantity.toLocaleString()} pcs ×{' '}
              <span className="text-brand-gold">
                ₹{parseFloat(sortedTiers.find((t) => t.quantity === selectedQuantity)?.unit_price ?? '0').toFixed(2)}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-sm">You pay</p>
            <p className="text-2xl font-bold text-brand-gold">
              ₹{parseFloat(sortedTiers.find((t) => t.quantity === selectedQuantity)?.total_price ?? '0').toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
