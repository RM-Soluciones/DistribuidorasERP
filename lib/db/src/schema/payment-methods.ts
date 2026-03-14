import { pgTable, serial, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const paymentMethodTypeEnum = pgEnum("payment_method_type", [
  "cash", "bank_transfer", "credit_card", "debit_card", "check", "other"
]);

export const paymentMethodsTable = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: paymentMethodTypeEnum("type").notNull().default("cash"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PaymentMethod = typeof paymentMethodsTable.$inferSelect;
