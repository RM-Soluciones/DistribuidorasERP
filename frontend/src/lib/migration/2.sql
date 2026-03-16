-- ============================================================
-- DISTRIBUIDORA DB - SCRIPT FUNCIONAL PARA SUPABASE
-- ============================================================

-- =====================
-- ENUMS
-- =====================

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
CREATE TYPE user_role AS ENUM ('customer','admin');
END IF;
END $$;

-- Añadir roles adicionales si no existen (seller/repartidor)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'seller' AND enumtypid = 'user_role'::regtype
  ) THEN
    ALTER TYPE user_role ADD VALUE 'seller';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'delivery' AND enumtypid = 'user_role'::regtype
  ) THEN
    ALTER TYPE user_role ADD VALUE 'delivery';
  END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
CREATE TYPE order_status AS ENUM (
'pending',
'confirmed',
'processing',
'shipped',
'delivered',
'cancelled'
);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type') THEN
CREATE TYPE discount_type AS ENUM ('percentage','fixed');
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_type') THEN
CREATE TYPE offer_type AS ENUM ('percentage','fixed_amount','bundle_price');
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_status') THEN
CREATE TYPE purchase_status AS ENUM ('pending','partial','paid');
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
CREATE TYPE payment_method_type AS ENUM (
'cash',
'bank_transfer',
'credit_card',
'debit_card',
'check',
'other'
);
END IF;
END $$;

-- =====================
-- TABLES
-- =====================

CREATE TABLE IF NOT EXISTS users (
id SERIAL PRIMARY KEY,
name TEXT NOT NULL,
email TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
role user_role DEFAULT 'customer',
phone TEXT,
address TEXT,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
id SERIAL PRIMARY KEY,
name TEXT UNIQUE NOT NULL,
description TEXT,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
id SERIAL PRIMARY KEY,
name TEXT NOT NULL,
description TEXT,
price NUMERIC(12,2) NOT NULL,
stock INTEGER DEFAULT 0,
sku TEXT,
image_url TEXT,
category_id INTEGER REFERENCES categories(id),
is_active BOOLEAN DEFAULT TRUE,
expires_at TIMESTAMP,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
id SERIAL PRIMARY KEY,
name TEXT NOT NULL,
contact_name TEXT,
phone TEXT,
email TEXT,
address TEXT,
tax_id TEXT,
notes TEXT,
is_active BOOLEAN DEFAULT TRUE,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
id SERIAL PRIMARY KEY,
user_id INTEGER REFERENCES users(id),
status order_status DEFAULT 'pending',
total NUMERIC(12,2) NOT NULL,
subtotal NUMERIC(12,2),
discount_amount NUMERIC(12,2),
notes TEXT,
shipping_address TEXT,
customer_name TEXT,
is_pos BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
id SERIAL PRIMARY KEY,
order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
product_id INTEGER REFERENCES products(id),
quantity INTEGER NOT NULL,
unit_price NUMERIC(12,2),
subtotal NUMERIC(12,2),
created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
id SERIAL PRIMARY KEY,
supplier_id INTEGER REFERENCES suppliers(id),
invoice_number TEXT,
purchase_date TIMESTAMP DEFAULT NOW(),
total_amount NUMERIC(12,2),
paid_amount NUMERIC(12,2) DEFAULT 0,
status purchase_status DEFAULT 'pending',
notes TEXT,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
id SERIAL PRIMARY KEY,
purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
product_id INTEGER REFERENCES products(id),
quantity INTEGER,
purchase_price NUMERIC(12,2),
sale_price NUMERIC(12,2),
expires_at TIMESTAMP,
created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_methods (
id SERIAL PRIMARY KEY,
name TEXT,
type payment_method_type DEFAULT 'cash',
is_active BOOLEAN DEFAULT TRUE,
  is_pos BOOLEAN DEFAULT TRUE,
  is_purchase BOOLEAN DEFAULT TRUE,
  is_delivery BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Backwards compatible: add new flags if table existed before this migration
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS is_pos BOOLEAN DEFAULT TRUE;
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS is_purchase BOOLEAN DEFAULT TRUE;
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS is_delivery BOOLEAN DEFAULT TRUE;
amount NUMERIC(12,2),
payment_method_id INTEGER REFERENCES payment_methods(id),
notes TEXT,
paid_at TIMESTAMP DEFAULT NOW(),
created_at TIMESTAMP DEFAULT NOW()
);

-- Pagos y entregas de pedidos (repartidor cobra al cliente)
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_payment_status') THEN
CREATE TYPE order_payment_status AS ENUM ('pending','paid','failed');
END IF;
END $$;

CREATE TABLE IF NOT EXISTS order_payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_method_id INTEGER REFERENCES payment_methods(id),
  status order_payment_status NOT NULL DEFAULT 'pending',
  collected_by INTEGER REFERENCES users(id),
  collected_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS order_deliveries (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  assigned_to INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  delivery_date DATE,
  status TEXT DEFAULT 'pending',
  delivered_at TIMESTAMP,
  notes TEXT
);

-- Ensure each order has at most one delivery assignment record
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'order_deliveries_order_id_idx'
  ) THEN
    CREATE UNIQUE INDEX order_deliveries_order_id_idx ON order_deliveries(order_id);
  END IF;
END $$;

-- Add missing columns if the table existed before this migration
ALTER TABLE order_deliveries
  ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- =====================
-- RLS (SIMPLIFICADO)
-- =====================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- lectura pública
CREATE POLICY users_read ON users FOR SELECT USING (true);
CREATE POLICY products_read ON products FOR SELECT USING (true);
CREATE POLICY categories_read ON categories FOR SELECT USING (true);
CREATE POLICY suppliers_read ON suppliers FOR SELECT USING (true);

-- escritura libre (para backend)
CREATE POLICY users_write ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY products_write ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY categories_write ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY suppliers_write ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY orders_write ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY order_items_write ON order_items FOR ALL USING (true) WITH CHECK (true);

-- =====================
-- SEED DATA
-- =====================

INSERT INTO users (name,email,password_hash,role)
VALUES
('Administrador','admin@distribuidora.com','admin123','admin'),
('Cliente Demo','cliente@ejemplo.com','cliente123','customer')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (name,description)
VALUES
('Bebidas','Bebidas frías y calientes'),
('Snacks','Bocadillos'),
('Lácteos','Productos lácteos'),
('Limpieza','Productos de limpieza')
ON CONFLICT (name) DO NOTHING;

INSERT INTO suppliers (name,email,phone)
VALUES
('Distribuidora Central','ventas@central.com','5550100'),
('Proveedor Express','contacto@express.com','5550200')
ON CONFLICT DO NOTHING;

INSERT INTO products (name,description,price,stock,category_id)
VALUES
('Agua Mineral 500ml','Botella de agua',15.50,120,(SELECT id FROM categories WHERE name='Bebidas')),
('Galletas Chocolate','Paquete 200g',45.00,60,(SELECT id FROM categories WHERE name='Snacks')),
('Leche 1L','Leche fresca',70.00,80,(SELECT id FROM categories WHERE name='Lácteos')),
('Detergente 1L','Detergente líquido',95.00,40,(SELECT id FROM categories WHERE name='Limpieza'))
ON CONFLICT DO NOTHING;

-- =====================
-- AUTH USERS (Supabase)
-- =====================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'admin_create_user'
      AND n.nspname = 'auth'
  ) THEN
    PERFORM auth.admin_create_user(
      json_build_object(
        'email', 'admin@distribuidora.com',
        'password', 'admin123',
        'email_confirm', true
      )
    );
  ELSE
    RAISE NOTICE 'auth.admin_create_user not available; create admin@distribuidora.com manually in Supabase Auth';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'admin_create_user'
      AND n.nspname = 'auth'
  ) THEN
    PERFORM auth.admin_create_user(
      json_build_object(
        'email', 'cliente@ejemplo.com',
        'password', 'cliente123',
        'email_confirm', true
      )
    );
  ELSE
    RAISE NOTICE 'auth.admin_create_user not available; create cliente@ejemplo.com manually in Supabase Auth';
  END IF;
END $$;
