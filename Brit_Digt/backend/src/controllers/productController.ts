import { Request, Response } from 'express';
import { query } from '../db/connection';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/products — list all active products with their pricing tiers
export const listProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'quantity',    pt.quantity,
              'unit_price',  pt.unit_price,
              'total_price', pt.total_price
            ) ORDER BY pt.quantity
          ) FILTER (WHERE pt.id IS NOT NULL),
          '[]'
        ) AS pricing_tiers
      FROM products p
      LEFT JOIN pricing_tiers pt ON pt.product_id = p.id
      WHERE p.is_active = TRUE
      GROUP BY p.id
      ORDER BY p.category, p.base_price
    `);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('listProducts error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
};

// GET /api/products/:id — single product with pricing tiers
export const getProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  // Reject non-UUID IDs immediately (e.g. mock-bc-1 from static catalog)
  if (!UUID_RE.test(id)) {
    res.status(404).json({ success: false, error: 'Product not found' });
    return;
  }

  try {
    const result = await query(
      `SELECT
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'quantity',    pt.quantity,
              'unit_price',  pt.unit_price,
              'total_price', pt.total_price
            ) ORDER BY pt.quantity
          ) FILTER (WHERE pt.id IS NOT NULL),
          '[]'
        ) AS pricing_tiers
      FROM products p
      LEFT JOIN pricing_tiers pt ON pt.product_id = p.id
      WHERE p.id = $1 AND p.is_active = TRUE
      GROUP BY p.id`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('getProduct error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
};
