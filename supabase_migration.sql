-- ═══════════════════════════════════════════════════════════════
-- LaNature Hotel — Supabase Database Migration
-- Paste this entire script in the Supabase SQL Editor and run
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────
-- 1. PRODUCTS TABLE (Menu Items)
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('starters', 'main', 'beverages', 'desserts')),
  price INTEGER NOT NULL CHECK (price > 0),
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  is_veg BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster category filtering
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_available ON products(is_available);

-- ─────────────────────────────────────
-- 2. ORDERS TABLE
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'Table' CHECK (location_type IN ('Table', 'Room')),
  location_number TEXT NOT NULL DEFAULT '1',
  total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'delivered', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('online', 'cash', NULL)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- ─────────────────────────────────────
-- 3. ORDER ITEMS TABLE
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price INTEGER NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching items by order
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- ─────────────────────────────────────
-- 4. AUTO-UPDATE updated_at TRIGGER
-- ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Products: Anyone can read, only authenticated users (admin) can modify
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Products are editable by authenticated users"
  ON products FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Orders: Anyone can insert (customers place orders), authenticated can manage
CREATE POLICY "Orders are viewable by everyone"
  ON orders FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete orders"
  ON orders FOR DELETE
  USING (auth.role() = 'authenticated');

-- Order Items: Same as orders
CREATE POLICY "Order items are viewable by everyone"
  ON order_items FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order items"
  ON order_items FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete order items"
  ON order_items FOR DELETE
  USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────
-- 6. USEFUL VIEWS
-- ─────────────────────────────────────

-- View: Orders with items (for admin dashboard)
CREATE OR REPLACE VIEW orders_with_items AS
SELECT
  o.*,
  COALESCE(
    json_agg(
      json_build_object(
        'name', oi.item_name,
        'qty', oi.quantity,
        'price', oi.price
      )
    ) FILTER (WHERE oi.id IS NOT NULL),
    '[]'::json
  ) AS items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id
ORDER BY o.created_at DESC;

-- View: Daily revenue summary (for revenue history)
CREATE OR REPLACE VIEW daily_revenue AS
SELECT
  DATE(created_at) AS order_date,
  COUNT(*) AS total_orders,
  SUM(total) AS total_revenue,
  ROUND(AVG(total)) AS avg_order_value,
  SUM(CASE WHEN payment_method = 'online' THEN total ELSE 0 END) AS online_revenue,
  SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) AS cash_revenue
FROM orders
WHERE status != 'cancelled'
GROUP BY DATE(created_at)
ORDER BY order_date DESC;

-- ─────────────────────────────────────
-- 7. SEED DATA (Menu Products)
-- ─────────────────────────────────────
INSERT INTO products (name, category, price, description, image_url, is_veg) VALUES
  -- Starters
  ('Paneer Tikka', 'starters', 220, 'Creamy marinated cottage cheese, grilled in tandoor', 'images/paneer-tikka.png', TRUE),
  ('Veg Spring Rolls', 'starters', 180, 'Crispy rolls with fresh vegetables', 'images/spring-rolls.png', TRUE),
  ('Chicken Seekh Kebab', 'starters', 280, 'Minced chicken with aromatic spices', 'images/seekh-kebab.png', FALSE),

  -- Main Course
  ('Dal Makhani', 'main', 240, 'Slow-cooked black lentils in rich gravy', 'images/dal-makhani.png', TRUE),
  ('Butter Chicken', 'main', 320, 'Tender chicken in tomato-butter sauce', 'images/butter-chicken.png', FALSE),
  ('Paneer Butter Masala', 'main', 260, 'Cottage cheese in creamy tomato gravy', 'images/paneer-butter-masala.png', TRUE),
  ('Biryani (Veg)', 'main', 280, 'Fragrant basmati rice with vegetables', 'images/veg-biryani.png', TRUE),
  ('Biryani (Chicken)', 'main', 340, 'Aromatic rice with tender chicken', 'images/chicken-biryani.png', FALSE),

  -- Beverages
  ('Fresh Lime Soda', 'beverages', 80, 'Refreshing citrus drink with soda', 'images/mango-lassi.png', TRUE),
  ('Mango Lassi', 'beverages', 120, 'Cool yogurt drink with fresh mango', 'images/mango-lassi.png', TRUE),
  ('Masala Chai', 'beverages', 60, 'Aromatic Indian spiced tea', 'images/dal-makhani.png', TRUE),
  ('Cold Coffee', 'beverages', 140, 'Chilled coffee with ice cream', 'images/mango-lassi.png', TRUE),

  -- Desserts
  ('Gulab Jamun', 'desserts', 110, 'Soft milk dumplings in sugar syrup', 'images/gulab-jamun.png', TRUE),
  ('Ice Cream (2 scoops)', 'desserts', 130, 'Choice of vanilla / chocolate / mango', 'images/ice-cream.png', TRUE),
  ('Rasgulla', 'desserts', 100, 'Spongy cottage cheese balls in syrup', 'images/rasgulla.png', TRUE);

-- ═══════════════════════════════════════════════════════════════
-- DONE! Your database is ready.
-- 
-- Tables created:
--   ✅ products     — Menu items (15 items seeded)
--   ✅ orders       — Customer orders
--   ✅ order_items  — Items within each order
--
-- Views created:
--   ✅ orders_with_items — Orders with item details (JSON)
--   ✅ daily_revenue     — Date-wise revenue summary
--
-- Security:
--   ✅ RLS enabled on all tables
--   ✅ Public can read products & place orders
--   ✅ Only authenticated users can edit/delete
-- ═══════════════════════════════════════════════════════════════
