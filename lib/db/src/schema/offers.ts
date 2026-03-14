import { pgTable, serial, text, numeric, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { productsTable } from "./products";

export const offerTypeEnum = pgEnum("offer_type", ["percentage", "fixed_amount", "bundle_price"]);

export const offersTable = pgTable("offers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: offerTypeEnum("type").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  minTotalQuantity: integer("min_total_quantity"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const offerProductsTable = pgTable("offer_products", {
  id: serial("id").primaryKey(),
  offerId: integer("offer_id").notNull().references(() => offersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  minQuantity: integer("min_quantity").notNull().default(1),
});

export type Offer = typeof offersTable.$inferSelect;
export type OfferProduct = typeof offerProductsTable.$inferSelect;
