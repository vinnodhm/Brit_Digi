-- ============================================================
-- Britannia Digi Print — PostgreSQL Schema (Neon DB)
-- Phase 1 MVP: 2D Paper Products Only
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE product_category AS ENUM (
  'business_card',
  'flyer',
  'label',
  'poster',
  'brochure'
);

CREATE TYPE order_status AS ENUM (
  'pending',
  'payment_confirmed',
  'in_production',
  'dispatched',
  'delivered',
  'cancelled'
);

CREATE TYPE paper_finish AS ENUM (
  'matte',
  'gloss',
  'soft_touch',
  'uncoated'
);

-- ============================================================
-- USERS TABLE
-- NOTE: address fields use TEXT (no character limit) to support
-- complex Indian landmark-based addresses for final-mile routing.
-- Examples: "Opp. Hanuman Mandir, Near Water Tank, Sector 14-B, 
--            Behind Shri Ram Colony, Rohini, North West Delhi - 110085"
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(320) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone         VARCHAR(15),
  -- Unstructured address field for Indian landmark-based addresses (no char limit)
  address       TEXT,
  city          VARCHAR(100),
  state         VARCHAR(100),
  pincode       VARCHAR(10),
  gstin         VARCHAR(15),    -- GST identification for B2B customers
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  category        product_category NOT NULL,
  description     TEXT,
  base_price      NUMERIC(10, 2) NOT NULL,   -- price for minimum quantity tier
  width_mm        NUMERIC(8, 2) NOT NULL,
  height_mm       NUMERIC(8, 2) NOT NULL,
  bleed_mm        NUMERIC(4, 2) NOT NULL DEFAULT 3.0,
  safe_zone_mm    NUMERIC(4, 2) NOT NULL DEFAULT 3.0,
  paper_finish    paper_finish NOT NULL DEFAULT 'matte',
  paper_gsm       INTEGER NOT NULL DEFAULT 350,
  min_quantity    INTEGER NOT NULL DEFAULT 50,
  thumbnail_url   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default product catalog
INSERT INTO products (name, category, description, base_price, width_mm, height_mm, bleed_mm, paper_finish, paper_gsm, min_quantity, thumbnail_url)
VALUES
  ('Standard Business Card',   'business_card', '85×55mm premium matte business card, 350gsm', 299.00,  85.0,  55.0, 3.0, 'matte',     350, 100, '/images/products/business-card-matte.jpg'),
  ('Gloss Business Card',      'business_card', '85×55mm glossy business card, 350gsm',         349.00,  85.0,  55.0, 3.0, 'gloss',     350, 100, '/images/products/business-card-gloss.jpg'),
  ('A5 Flyer',                 'flyer',         'A5 single-sided promotional flyer, 130gsm',     599.00, 148.0, 210.0, 3.0, 'gloss',     130, 100, '/images/products/a5-flyer.jpg'),
  ('A4 Flyer',                 'flyer',         'A4 single-sided promotional flyer, 130gsm',     899.00, 210.0, 297.0, 3.0, 'gloss',     130,  50, '/images/products/a4-flyer.jpg'),
  ('Round Label 50mm',         'label',         '50mm diameter round label, self-adhesive',       199.00,  50.0,  50.0, 2.0, 'gloss',      90, 250, '/images/products/round-label.jpg'),
  ('Rectangle Label 90×55mm',  'label',         '90×55mm rectangle label, self-adhesive',         249.00,  90.0,  55.0, 2.0, 'matte',      90, 250, '/images/products/rect-label.jpg')
ON CONFLICT DO NOTHING;

-- ============================================================
-- ORDERS TABLE
-- NOTE: shipping_address and billing_address use TEXT (no char limit)
-- to support expansive Indian landmark-based addresses preventing
-- final-mile delivery routing failures.
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  product_id        UUID NOT NULL REFERENCES products(id),
  quantity          INTEGER NOT NULL CHECK (quantity > 0),
  unit_price        NUMERIC(10, 2) NOT NULL,
  total_price       NUMERIC(10, 2) NOT NULL,
  -- Unstructured shipping address for Indian landmark-based addresses (no char limit)
  shipping_address  TEXT NOT NULL,
  -- Unstructured billing address (may differ from shipping)
  billing_address   TEXT NOT NULL,
  customer_name     VARCHAR(255) NOT NULL,
  customer_email    VARCHAR(320) NOT NULL,
  customer_phone    VARCHAR(15),
  canvas_json       JSONB,                   -- serialized Fabric.js canvas state
  pdf_path          TEXT,                    -- path to generated PDF/X file
  pdf_url           TEXT,                    -- public URL for PDF download
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status            order_status NOT NULL DEFAULT 'pending',
  notes             TEXT,                    -- special instructions (unstructured)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================================
-- PRICING TIERS TABLE (quantity-based pricing per product)
-- ============================================================

CREATE TABLE IF NOT EXISTS pricing_tiers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL,
  unit_price  NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  UNIQUE (product_id, quantity)
);

-- Seed pricing tiers
INSERT INTO pricing_tiers (product_id, quantity, unit_price)
SELECT p.id, t.quantity, t.unit_price
FROM products p
CROSS JOIN (VALUES
  (100,  2.99),
  (250,  2.49),
  (500,  1.99),
  (1000, 1.49)
) AS t(quantity, unit_price)
WHERE p.category = 'business_card'
ON CONFLICT DO NOTHING;

INSERT INTO pricing_tiers (product_id, quantity, unit_price)
SELECT p.id, t.quantity, t.unit_price
FROM products p
CROSS JOIN (VALUES
  (50,  11.98),
  (100,  8.99),
  (250,  6.99),
  (500,  5.49)
) AS t(quantity, unit_price)
WHERE p.category = 'flyer'
ON CONFLICT DO NOTHING;

INSERT INTO pricing_tiers (product_id, quantity, unit_price)
SELECT p.id, t.quantity, t.unit_price
FROM products p
CROSS JOIN (VALUES
  (250, 0.99),
  (500, 0.79),
  (1000, 0.59),
  (2500, 0.45)
) AS t(quantity, unit_price)
WHERE p.category = 'label'
ON CONFLICT DO NOTHING;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
