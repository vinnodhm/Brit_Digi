'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product, PricingTier, RazorpayOptions } from '@/types';
import { createOrder } from '@/lib/api';

declare global {
  interface Window {
    Razorpay: new (opts: RazorpayOptions) => { open: () => void };
  }
}

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY ?? 'rzp_test_REPLACE_WITH_YOUR_KEY';

type CheckoutStep = 'details' | 'payment' | 'success';

export default function CheckoutPage() {
  const [step, setStep]     = useState<CheckoutStep>('details');
  const [product, setProduct] = useState<Product | null>(null);
  const [tier, setTier]     = useState<PricingTier | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const [form, setForm] = useState({
    customerName:    '',
    customerEmail:   '',
    customerPhone:   '',
    shippingAddress: '',
    billingAddress:  '',
    sameAsBilling:   true,
    notes:           '',
  });

  const [errors, setErrors] = useState<Partial<typeof form>>({});

  // Load product & tier from session storage
  useEffect(() => {
    const storedProduct = sessionStorage.getItem('selectedProduct');
    const storedTier    = sessionStorage.getItem('selectedTier');
    if (storedProduct) setProduct(JSON.parse(storedProduct) as Product);
    if (storedTier)    setTier(JSON.parse(storedTier) as PricingTier);
  }, []);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src   = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'shippingAddress' && form.sameAsBilling ? { billingAddress: value } : {}),
    }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<typeof form> = {};
    if (!form.customerName.trim())    newErrors.customerName    = 'Name is required';
    if (!form.customerEmail.trim())   newErrors.customerEmail   = 'Email is required';
    if (!form.shippingAddress.trim()) newErrors.shippingAddress = 'Shipping address is required';
    if (!form.billingAddress.trim() && !form.sameAsBilling) {
      newErrors.billingAddress = 'Billing address is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !product || !tier) return;
    setLoading(true);

    try {
      // Create order in DB first
      const response = await createOrder({
        productId:       product.id,
        quantity:        tier.quantity,
        customerName:    form.customerName,
        customerEmail:   form.customerEmail,
        customerPhone:   form.customerPhone,
        shippingAddress: form.shippingAddress,
        billingAddress:  form.sameAsBilling ? form.shippingAddress : form.billingAddress,
        notes:           form.notes,
      });
      setOrderId(response.orderId);
      setStep('payment');
    } catch (err) {
      // If API unavailable in dev, use a mock order ID
      console.warn('Order creation failed, using mock:', err);
      setOrderId('mock-order-' + Date.now());
      setStep('payment');
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayPayment = () => {
    if (!product || !tier || !window.Razorpay) return;

    const totalPaise = Math.round(parseFloat(tier.total_price) * 100); // Razorpay uses paise

    const options: RazorpayOptions = {
      key:         RAZORPAY_KEY,
      amount:      totalPaise,
      currency:    'INR',
      name:        'Britannia Digi Print',
      description: `${product.name} × ${tier.quantity} pcs`,
      order_id:    orderId ?? undefined,
      handler: (response) => {
        setPaymentId(response.razorpay_payment_id);
        setStep('success');
        sessionStorage.removeItem('selectedProduct');
        sessionStorage.removeItem('selectedTier');
      },
      prefill: {
        name:    form.customerName,
        email:   form.customerEmail,
        contact: form.customerPhone,
      },
      theme: { color: '#C9A84C' },
      modal: {
        ondismiss: () => {
          console.log('Payment modal dismissed');
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const totalAmount = tier ? parseFloat(tier.total_price) : 0;
  const gstAmount   = totalAmount * 0.18;
  const grandTotal  = totalAmount + gstAmount;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb & Progress */}
      <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
        <nav className="flex items-center gap-2 text-sm text-white/40">
          <Link href="/" className="hover:text-white transition-colors">Products</Link>
          <span>/</span>
          <span className="text-brand-gold">Checkout</span>
        </nav>

        <div className="flex items-center gap-2">
          {(['details', 'payment', 'success'] as CheckoutStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === s ? 'bg-brand-gold text-brand-navy' :
                i < ['details','payment','success'].indexOf(step) ? 'bg-brand-gold/30 text-brand-gold' :
                'bg-white/10 text-white/40'
              }`}>
                {i + 1}
              </div>
              {i < 2 && <div className={`w-12 h-px ${i < ['details','payment','success'].indexOf(step) ? 'bg-brand-gold' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* ── SUCCESS ────────────────────────────────────────────────── */}
      {step === 'success' && (
        <div className="text-center py-20">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-5xl mx-auto mb-6 animate-pulse-gold">
            ✅
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-4">Order Confirmed!</h1>
          <p className="text-white/50 text-lg mb-2">Your payment was successful.</p>
          <p className="text-brand-gold font-mono text-sm mb-8">Payment ID: {paymentId}</p>
          <div className="glass-card p-6 max-w-md mx-auto mb-8 text-left space-y-2">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Order Summary</p>
            <p className="text-white"><span className="text-white/50">Product:</span> {product?.name}</p>
            <p className="text-white"><span className="text-white/50">Qty:</span> {tier?.quantity?.toLocaleString()} pcs</p>
            <p className="text-white"><span className="text-white/50">Total:</span> ₹{grandTotal.toFixed(2)}</p>
            <p className="text-white"><span className="text-white/50">Ship to:</span> {form.shippingAddress}</p>
          </div>
          <p className="text-white/40 text-sm mb-6">Your print file is being prepared. You&apos;ll receive a confirmation email shortly.</p>
          <Link href="/" className="btn-primary text-base px-8 py-3">
            Continue Shopping →
          </Link>
        </div>
      )}

      {step !== 'success' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Main Form ──────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── STEP 1: Details ─────────────────────────────────── */}
            {step === 'details' && (
              <form onSubmit={handleSubmitDetails} className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="text-xl font-display font-semibold text-white mb-5">Contact Information</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5">Full Name *</label>
                      <input
                        id="customer-name"
                        name="customerName"
                        value={form.customerName}
                        onChange={handleChange}
                        placeholder="Ravi Kumar"
                        className={`input-field ${errors.customerName ? 'border-red-400' : ''}`}
                      />
                      {errors.customerName && <p className="text-red-400 text-xs mt-1">{errors.customerName}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5">Email Address *</label>
                      <input
                        id="customer-email"
                        name="customerEmail"
                        type="email"
                        value={form.customerEmail}
                        onChange={handleChange}
                        placeholder="ravi@company.com"
                        className={`input-field ${errors.customerEmail ? 'border-red-400' : ''}`}
                      />
                      {errors.customerEmail && <p className="text-red-400 text-xs mt-1">{errors.customerEmail}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-white/50 mb-1.5">Mobile Number</label>
                      <input
                        id="customer-phone"
                        name="customerPhone"
                        type="tel"
                        value={form.customerPhone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="glass-card p-6">
                  <h2 className="text-xl font-display font-semibold text-white mb-2">Shipping Address</h2>
                  <p className="text-white/40 text-xs mb-4">
                    Include landmark, area, street — we support detailed Indian addresses.
                  </p>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">Full Delivery Address *</label>
                    <textarea
                      id="shipping-address"
                      name="shippingAddress"
                      value={form.shippingAddress}
                      onChange={handleChange}
                      rows={4}
                      placeholder={`e.g.\nShop No. 7, Ground Floor, Anand Chambers\nOpp. Hanuman Mandir, Near Railway Crossing\nKarol Bagh, Central Delhi — 110 005`}
                      className={`input-field resize-none ${errors.shippingAddress ? 'border-red-400' : ''}`}
                    />
                    {errors.shippingAddress && <p className="text-red-400 text-xs mt-1">{errors.shippingAddress}</p>}
                  </div>

                  <label className="flex items-center gap-2 mt-4 cursor-pointer">
                    <input
                      type="checkbox"
                      name="sameAsBilling"
                      checked={form.sameAsBilling}
                      onChange={handleChange}
                      className="w-4 h-4 accent-brand-gold rounded"
                    />
                    <span className="text-sm text-white/60">Billing address same as shipping</span>
                  </label>

                  {!form.sameAsBilling && (
                    <div className="mt-4">
                      <label className="block text-xs text-white/50 mb-1.5">Billing Address *</label>
                      <textarea
                        id="billing-address"
                        name="billingAddress"
                        value={form.billingAddress}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Full billing address..."
                        className={`input-field resize-none ${errors.billingAddress ? 'border-red-400' : ''}`}
                      />
                    </div>
                  )}
                </div>

                {/* Special Instructions */}
                <div className="glass-card p-6">
                  <h2 className="text-xl font-display font-semibold text-white mb-4">Special Instructions</h2>
                  <textarea
                    id="order-notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Any special delivery or print instructions..."
                    className="input-field resize-none"
                  />
                </div>

                <button
                  type="submit"
                  id="proceed-to-payment-btn"
                  disabled={loading}
                  className="btn-primary w-full text-base py-4 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Proceed to Payment →'}
                </button>
              </form>
            )}

            {/* ── STEP 2: Payment ──────────────────────────────────── */}
            {step === 'payment' && (
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <h2 className="text-xl font-display font-semibold text-white mb-5">Payment</h2>

                  {/* Razorpay CTA */}
                  <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-2xl p-6 text-center space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/20 flex items-center justify-center text-2xl">💳</div>
                      <div className="text-left">
                        <p className="text-white font-semibold">Pay with Razorpay</p>
                        <p className="text-white/40 text-xs">UPI · Cards · Net Banking · Wallets</p>
                      </div>
                    </div>

                    <div className="gold-divider" />

                    <div className="text-3xl font-bold text-white">
                      ₹{grandTotal.toFixed(2)}
                      <span className="text-base font-normal text-white/40 ml-2">incl. GST</span>
                    </div>

                    <button
                      id="razorpay-pay-btn"
                      onClick={handleRazorpayPayment}
                      className="btn-primary w-full text-base py-4 animate-pulse-gold"
                    >
                      🔐 Pay ₹{grandTotal.toFixed(2)} Securely
                    </button>

                    <p className="text-white/30 text-xs">
                      Test mode — use card 4111 1111 1111 1111, any future date & CVV
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4 text-center text-xs text-white/40">
                    <div>🔒 SSL Encrypted</div>
                    <div>🏦 RBI Compliant</div>
                    <div>↩️ Secure Refunds</div>
                  </div>
                </div>

                <button
                  onClick={() => setStep('details')}
                  className="text-white/40 hover:text-white transition-colors text-sm"
                >
                  ← Edit Details
                </button>
              </div>
            )}
          </div>

          {/* ── Order Summary Sidebar ─────────────────────────────── */}
          <div className="space-y-4">
            <div className="glass-card p-6 sticky top-20">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Order Summary</h3>

              {product && tier ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-xl">
                      🖨️
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{product.name}</p>
                      <p className="text-white/40 text-xs">{tier.quantity.toLocaleString()} pcs</p>
                      <p className="text-white/40 text-xs">{product.paper_gsm}gsm · {product.paper_finish}</p>
                    </div>
                  </div>

                  <div className="gold-divider" />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-white/60">
                      <span>Subtotal</span>
                      <span>₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white/60">
                      <span>GST (18%)</span>
                      <span>₹{gstAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white/60">
                      <span>Shipping</span>
                      <span className="text-emerald-400">FREE</span>
                    </div>
                    <div className="gold-divider" />
                    <div className="flex justify-between text-white font-bold text-base pt-1">
                      <span>Total</span>
                      <span className="text-brand-gold">₹{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-xs text-white/30 space-y-1 pt-2 border-t border-white/10">
                    <p>✅ Print-ready PDF/X included</p>
                    <p>✅ 3mm bleed automatically applied</p>
                    <p>✅ Free preflighting check</p>
                    <p>✅ Pan-India delivery within 5–7 days</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-white/40 text-sm">No product selected.</p>
                  <Link href="/" className="btn-primary text-sm mt-4">Browse Products</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
