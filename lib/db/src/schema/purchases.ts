import { pgTable, serial, integer, numeric, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { suppliersTable } from "./suppliers";
import { paymentMethodsTable } from "./payment-methods";
import { productsTable } from "./products";

export const purchaseStatusEnum = pgEnum("purchase_status", ["pending", "partial", "paid"]);

export const purchasesTable = pgTable("purchases", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id),
  invoiceNumber: text("invoice_number"),
  purchaseDate: timestamp("purchase_date").defaultNow().notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  status: purchaseStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const purchaseItemsTable = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull().references(() => purchasesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  quantity: integer("quantity").notNull(),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull(),
  salePrice: numeric("sale_price", { precision: 12, scale: 2 }).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supplierPaymentsTable = pgTable("supplier_payments", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").notNull().references(() => purchasesTable.id),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethodId: integer("payment_method_id").references(() => paymentMethodsTable.id),
  notes: text("notes"),
  paidAt: timestamp("paid_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Purchase = typeof purchasesTable.$inferSelect;
export type PurchaseItem = typeof purchaseItemsTable.$inferSelect;
export type SupplierPayment = typeof supplierPaymentsTable.$inferSelect;
