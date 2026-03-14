# Workspace

## Overview

Full-stack distributor company web app. Public storefront + private admin ERP panel.

## Features Implemented

- Public storefront: product catalog, category filtering, product detail, shopping cart, checkout with discount code support
- Customer area: registration, login, order history/dashboard
- Admin ERP panel: Dashboard, Products (with expiry dates), Orders (with detail dialog), Categories, Users, Discounts/Offers, POS (Point of Sale)
- Discount system: admin CRUD for promo codes, public `/discounts/validate` endpoint, applied to online orders + POS sales
- POS module: `/admin/pos` — in-person sales with product browser, category tabs, cart, discount codes, customer name, receipt view
- Product expiry dates: `expiresAt` field on products, warning banners in admin for expiring/expired items
- Order detail dialog in admin Orders page showing all line items, discount breakdown, POS badge

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Backend**: Supabase (PostgreSQL + Auth + Storage) – el código de Express/Drizzle ya no es necesario
- **Database schema**: definido en `supabase_migration.sql`
- **Validation**: Zod (en frontend)
- **Build**: Vite (React frontend)
- **Frontend**: React + Vite, TailwindCSS, shadcn/ui, React Query, Zustand, Framer Motion

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (port 8080)
│   └── distributor-app/    # React + Vite frontend (port 24384)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed.ts         # DB seed script
└── pnpm-workspace.yaml
```

## Application Features

### Public Site (/)
- **Home**: Landing page with hero and featured products
- **Products** (/products): Catalog with search and category filters
- **Product Detail** (/products/:id): Product page
- **Login** (/login): Customer login
- **Register** (/register): Customer registration
- **Cart** (/customer/cart): Shopping cart
- **Customer Dashboard** (/customer/dashboard): Order history

### Admin Panel (/admin)
- **Dashboard**: Stats (orders, revenue, products, users)
- **Products** (/admin/products): CRUD product management
- **Orders** (/admin/orders): View/update all orders and status
- **Users** (/admin/users): View all customers
- **Categories** (/admin/categories): CRUD category management

## Demo Credentials

- **Admin**: admin@distribuidora.com / admin123
- **Customer**: cliente@ejemplo.com / cliente123

## Database Schema

- `users` - customers and admins (role: customer|admin)
- `categories` - product categories
- `products` - product catalog
- `orders` - customer orders
- `order_items` - order line items

## Auth

Auth is handled by **Supabase Auth** (email/password). The frontend uses `@supabase/supabase-js` and the `users` table in Supabase is used for profile data.

## Backend (Supabase)

This project no longer runs an Express API server; the frontend talks directly to Supabase using:
- `@supabase/supabase-js` for auth + DB queries
- `supabase_migration.sql` for schema creation

### Tables used by the app
- `users` (profiles)
- `categories`
- `products`
- `orders`
- `order_items`
- `discounts`
- `offers`, `offer_products`
- `suppliers`, `purchases`, `purchase_items`, `supplier_payments`
- `payment_methods`

## DB setup (Supabase)

Run the SQL in `supabase_migration.sql` in Supabase SQL editor to create the schema + demo seed data.

> ⚠️ You should configure Row Level Security (RLS) policies in Supabase for production. The current setup assumes you are running in a trusted environment (development/demo).
