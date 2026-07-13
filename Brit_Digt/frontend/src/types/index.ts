// Shared TypeScript types across the frontend

export interface PricingTier {
  quantity: number;
  unit_price: string;
  total_price: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'business_card' | 'flyer' | 'label' | 'poster' | 'brochure';
  description: string;
  base_price: string;
  width_mm: string;
  height_mm: string;
  bleed_mm: string;
  safe_zone_mm: string;
  paper_finish: 'matte' | 'gloss' | 'soft_touch' | 'uncoated';
  paper_gsm: number;
  min_quantity: number;
  thumbnail_url: string | null;
  pricing_tiers: PricingTier[];
  is_active: boolean;
}

export interface Order {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  shipping_address: string;
  billing_address: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  canvas_json?: object;
  pdf_url?: string;
  razorpay_order_id?: string;
  status: 'pending' | 'payment_confirmed' | 'in_production' | 'dispatched' | 'delivered' | 'cancelled';
  notes?: string;
  created_at: string;
}

export interface CreateOrderPayload {
  productId: string;
  quantity: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;
  billingAddress: string;
  canvasJson?: object;
  razorpayOrderId?: string;
  notes?: string;
}

export interface GeneratePdfPayload {
  productId: string;
  productName?: string;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  canvasWidthPx: number;
  canvasHeightPx: number;
  objects: CanvasObject[];
  background?: string;
}

export type CanvasObjectType = 'textbox' | 'i-text' | 'text' | 'image' | 'rect';

export interface CanvasObject {
  type: CanvasObjectType;
  [key: string]: unknown;
}

// Razorpay types
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id?: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayInstance {
  open: () => void;
}
