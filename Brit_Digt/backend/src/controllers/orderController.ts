import { Request, Response } from 'express';
import { query } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

interface CreateOrderBody {
  productId: string;
  quantity: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: string;   // TEXT — unstructured Indian address
  billingAddress: string;    // TEXT — unstructured Indian address
  canvasJson?: object;
  razorpayOrderId?: string;
  notes?: string;
}

// POST /api/orders — create a new order
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateOrderBody;

  const {
    productId,
    quantity,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    billingAddress,
    canvasJson,
    razorpayOrderId,
    notes,
  } = body;

  if (!productId || !quantity || !customerName || !customerEmail || !shippingAddress || !billingAddress) {
    res.status(400).json({ success: false, error: 'Missing required order fields' });
    return;
  }

  try {
    // Fetch product and applicable pricing tier
    const productResult = await query(
      `SELECT p.*, pt.unit_price as tier_unit_price
       FROM products p
       LEFT JOIN pricing_tiers pt ON pt.product_id = p.id AND pt.quantity = $2
       WHERE p.id = $1 AND p.is_active = TRUE`,
      [productId, quantity]
    );

    if (productResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const product = productResult.rows[0];
    const unitPrice: number = parseFloat(String(product.tier_unit_price ?? product.base_price));
    const totalPrice: number = unitPrice * quantity;
    const orderId = uuidv4();

    await query(
      `INSERT INTO orders (
        id, product_id, quantity, unit_price, total_price,
        shipping_address, billing_address,
        customer_name, customer_email, customer_phone,
        canvas_json, razorpay_order_id, notes, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending')`,
      [
        orderId,
        productId,
        quantity,
        unitPrice,
        totalPrice,
        shippingAddress,
        billingAddress,
        customerName,
        customerEmail,
        customerPhone ?? null,
        canvasJson ? JSON.stringify(canvasJson) : null,
        razorpayOrderId ?? null,
        notes ?? null,
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        orderId,
        totalPrice,
        unitPrice,
        status: 'pending',
      },
    });
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
};

// GET /api/orders/:id — get order details
export const getOrder = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT o.*, p.name as product_name, p.category, p.width_mm, p.height_mm
       FROM orders o
       JOIN products p ON p.id = o.product_id
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('getOrder error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
};

// PATCH /api/orders/:id/status — update order status (admin)
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, razorpayPaymentId } = req.body as { status: string; razorpayPaymentId?: string };

  try {
    await query(
      `UPDATE orders SET status = $1, razorpay_payment_id = COALESCE($2, razorpay_payment_id) WHERE id = $3`,
      [status, razorpayPaymentId ?? null, id]
    );
    res.json({ success: true, message: 'Order status updated' });
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
};
