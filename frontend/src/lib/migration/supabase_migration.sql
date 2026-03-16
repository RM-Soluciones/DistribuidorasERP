-- ============================================================
-- Supabase Migration - Distribuidora App
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE "user_role" AS ENUM ('customer', 'admin');

CREATE TYPE "order_status" AS ENUM (
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled'
);

CREATE TYPE "discount_type" AS ENUM ('percentage', 'fixed');

CREATE TYPE "offer_type" AS ENUM ('percentage', 'fixed_amount', 'bundle_price');

CREATE TYPE "purchase_status" AS ENUM ('pending', 'partial', 'paid');

CREATE TYPE "payment_method_type" AS ENUM (
  'cash',
  'bank_transfer',
  'credit_card',
  'debit_card',
  'check',
  'other'
);

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE "users" (
  "id"            SERIAL PRIMARY KEY,
  "name"          TEXT NOT NULL,
  "email"         TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "role"          "user_role" NOT NULL DEFAULT 'customer',
  "phone"         TEXT,
  "address"       TEXT,
  "modules"       JSONB NOT NULL DEFAULT '{}',
  "created_at"    TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "categories" (
  "id"          SERIAL PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "created_at"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "products" (
  "id"          SERIAL PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "price"       NUMERIC(12, 2) NOT NULL,
  "stock"       INTEGER NOT NULL DEFAULT 0,
  "sku"         TEXT,
  "image_url"   TEXT,
  "category_id" INTEGER REFERENCES "categories"("id"),
  "is_active"   BOOLEAN NOT NULL DEFAULT TRUE,
  "expires_at"  TIMESTAMP,
  "created_at"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "discounts" (
  "id"               SERIAL PRIMARY KEY,
  "code"             TEXT NOT NULL UNIQUE,
  "name"             TEXT NOT NULL,
  "type"             "discount_type" NOT NULL,
  "value"            NUMERIC(10, 2) NOT NULL,
  "min_order_amount" NUMERIC(10, 2),
  "max_uses"         INTEGER,
  "used_count"       INTEGER NOT NULL DEFAULT 0,
  "is_active"        BOOLEAN NOT NULL DEFAULT TRUE,
  "expires_at"       TIMESTAMP,
  "created_at"       TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "offers" (
  "id"                SERIAL PRIMARY KEY,
  "name"              TEXT NOT NULL,
  "description"       TEXT,
  "type"              "offer_type" NOT NULL,
  "value"             NUMERIC(12, 2) NOT NULL,
  "min_total_quantity" INTEGER,
  "is_active"         BOOLEAN NOT NULL DEFAULT TRUE,
  "expires_at"        TIMESTAMP,
  "created_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "offer_products" (
  "id"           SERIAL PRIMARY KEY,
  "offer_id"     INTEGER NOT NULL REFERENCES "offers"("id") ON DELETE CASCADE,
  "product_id"   INTEGER NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "min_quantity" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE "orders" (
  "id"              SERIAL PRIMARY KEY,
  "user_id"         INTEGER NOT NULL REFERENCES "users"("id"),
  "status"          "order_status" NOT NULL DEFAULT 'pending',
  "total"           NUMERIC(12, 2) NOT NULL,
  "subtotal"        NUMERIC(12, 2),
  "discount_amount" NUMERIC(12, 2),
  "discount_code"   TEXT,
  "notes"           TEXT,
  "shipping_address" TEXT,
  "customer_name"   TEXT,
  "is_pos"          BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at"      TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "order_items" (
  "id"         SERIAL PRIMARY KEY,
  "order_id"   INTEGER NOT NULL REFERENCES "orders"("id"),
  "product_id" INTEGER NOT NULL REFERENCES "products"("id"),
  "quantity"   INTEGER NOT NULL,
  "unit_price" NUMERIC(12, 2) NOT NULL,
  "subtotal"   NUMERIC(12, 2) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table que guarda las asignaciones de un pedido a un repartidor.
-- Se usa en la UI de asignar pedido y en la vista del chofer.
CREATE TABLE "order_deliveries" (
  "id"            SERIAL PRIMARY KEY,
  "order_id"      INTEGER NOT NULL REFERENCES "orders"("id"),
  "assigned_to"   INTEGER REFERENCES "users"("id"),
  "delivery_date" DATE,
  "status"        TEXT NOT NULL DEFAULT 'pending',
  "delivered_at"  TIMESTAMP,
  "notes"         TEXT,
  "created_at"    TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "order_deliveries_order_id_uindex" ON "order_deliveries" ("order_id");

-- Pagos de pedidos (pueden ser múltiples, con distintos métodos)
CREATE TABLE "order_payments" (
  "id"                SERIAL PRIMARY KEY,
  "order_id"          INTEGER NOT NULL REFERENCES "orders"("id"),
  "payment_method_id" INTEGER NOT NULL REFERENCES "payment_methods"("id"),
  "amount"            NUMERIC(12, 2) NOT NULL,
  "created_at"        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "order_payments_order_id_idx" ON "order_payments" ("order_id");

CREATE TABLE "suppliers" (
  "id"           SERIAL PRIMARY KEY,
  "name"         TEXT NOT NULL,
  "contact_name" TEXT,
  "phone"        TEXT,
  "email"        TEXT,
  "address"      TEXT,
  "tax_id"       TEXT,
  "notes"        TEXT,
  "is_active"    BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "payment_methods" (
  "id"         SERIAL PRIMARY KEY,
  "name"       TEXT NOT NULL,
  "type"       "payment_method_type" NOT NULL DEFAULT 'cash',
  "is_active"  BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "purchases" (
  "id"             SERIAL PRIMARY KEY,
  "supplier_id"    INTEGER NOT NULL REFERENCES "suppliers"("id"),
  "invoice_number" TEXT,
  "purchase_date"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "total_amount"   NUMERIC(12, 2) NOT NULL,
  "paid_amount"    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  "status"         "purchase_status" NOT NULL DEFAULT 'pending',
  "notes"          TEXT,
  "created_at"     TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "purchase_items" (
  "id"             SERIAL PRIMARY KEY,
  "purchase_id"    INTEGER NOT NULL REFERENCES "purchases"("id") ON DELETE CASCADE,
  "product_id"     INTEGER NOT NULL REFERENCES "products"("id"),
  "quantity"       INTEGER NOT NULL,
  "purchase_price" NUMERIC(12, 2) NOT NULL,
  "sale_price"     NUMERIC(12, 2) NOT NULL,
  "expires_at"     TIMESTAMP,
  "created_at"     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "supplier_payments" (
  "id"                SERIAL PRIMARY KEY,
  "purchase_id"       INTEGER NOT NULL REFERENCES "purchases"("id"),
  "supplier_id"       INTEGER NOT NULL REFERENCES "suppliers"("id"),
  "amount"            NUMERIC(12, 2) NOT NULL,
  "payment_method_id" INTEGER REFERENCES "payment_methods"("id"),
  "notes"             TEXT,
  "paid_at"           TIMESTAMP NOT NULL DEFAULT NOW(),
  "created_at"        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES (optional but recommended for performance)
-- ============================================================

CREATE INDEX idx_products_category_id ON "products"("category_id");
CREATE INDEX idx_orders_user_id ON "orders"("user_id");
CREATE INDEX idx_order_items_order_id ON "order_items"("order_id");
CREATE INDEX idx_order_items_product_id ON "order_items"("product_id");
CREATE INDEX idx_purchases_supplier_id ON "purchases"("supplier_id");
CREATE INDEX idx_purchase_items_purchase_id ON "purchase_items"("purchase_id");
CREATE INDEX idx_supplier_payments_purchase_id ON "supplier_payments"("purchase_id");
CREATE INDEX idx_offer_products_offer_id ON "offer_products"("offer_id");

-- ============================================================
-- SEED DATA (demo credentials)
-- Admin: admin@distribuidora.com / admin123
-- Customer: cliente@ejemplo.com / cliente123
-- Passwords use SHA-256 with salt "dist_salt_2024"
-- admin@distribuidora.com -> admin123
-- cliente@ejemplo.com -> cliente123
INSERT INTO "users" ("name", "email", "password_hash", "role", "phone", "address") VALUES
  ('Administrador', 'admin@distribuidora.com', '94e14314e581fc26675fa25c9b3462065ac5c9bd4bfcca2888e6f031abd6cbf9', 'admin', '+1-555-0001', 'Av. Principal 123'),
  ('Cliente Demo', 'cliente@ejemplo.com', 'f90198175d8400bee5ad5a30b1e3ea9a9ad01069f33b3d4757032eb108f84991', 'customer', '+1-555-0002', 'Calle Secundaria 456');
