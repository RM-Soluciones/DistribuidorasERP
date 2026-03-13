# Workspace

## Overview

Full-stack distributor company web app. Public storefront + private admin ERP panel.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
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

Session-based auth via express-session. `/api/auth/me` returns current user.

## API Routes

All routes under `/api`:
- `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`
- `/categories` (GET, POST, PUT/:id, DELETE/:id)
- `/products` (GET, POST, GET/:id, PUT/:id, DELETE/:id)
- `/orders` (GET, POST, GET/:id, PUT/:id/status)
- `/admin/users`, `/admin/stats`

## Codegen

Run: `pnpm --filter @workspace/api-spec run codegen`

## DB Seed

Run: `pnpm --filter @workspace/scripts run seed`

## DB Migration

Run: `pnpm --filter @workspace/db run push`
