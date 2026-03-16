-- Enable all user accounts and grant all modules
-- Run this script in Supabase SQL editor (or your PostgreSQL client).

UPDATE "users"
SET is_active = TRUE;

UPDATE "users"
SET modules = '{
  "dashboard": true,
  "categories": true,
  "discounts": true,
  "offers": true,
  "orders": true,
  "payment_methods": true,
  "pos": true,
  "products": true,
  "purchases": true,
  "suppliers": true,
  "users": true,
  "deliveries": true
}'::jsonb;
