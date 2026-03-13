import { Router } from "express";
import { db, ordersTable, orderItemsTable, usersTable, productsTable, discountsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router = Router();

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return false; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return false; }
  return true;
}

router.post("/sale", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const adminId = (req.session as any).userId;

  const { items, discountCode, customerName, notes } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "At least one item is required" }); return;
  }

  const productIds = items.map((i: any) => i.productId);
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  let subtotal = 0;
  const orderItemsData = [];
  for (const item of items) {
    const product = productMap[item.productId];
    if (!product) { res.status(400).json({ error: `Product ${item.productId} not found` }); return; }
    if (product.stock < item.quantity) {
      res.status(400).json({ error: `Stock insuficiente para ${product.name}` }); return;
    }
    const price = parseFloat(product.price as string);
    const itemSubtotal = price * item.quantity;
    subtotal += itemSubtotal;
    orderItemsData.push({ productId: item.productId, quantity: item.quantity, unitPrice: price, subtotal: itemSubtotal });
  }

  // Apply discount
  let discountAmount = 0;
  let appliedCode: string | null = null;
  if (discountCode) {
    const [discount] = await db.select().from(discountsTable).where(eq(discountsTable.code, discountCode.toUpperCase())).limit(1);
    if (discount && discount.isActive && (!discount.expiresAt || discount.expiresAt > new Date())) {
      if (!discount.minOrderAmount || subtotal >= parseFloat(discount.minOrderAmount as string)) {
        if (!discount.maxUses || discount.usedCount < discount.maxUses) {
          if (discount.type === "percentage") {
            discountAmount = (subtotal * parseFloat(discount.value as string)) / 100;
          } else {
            discountAmount = Math.min(parseFloat(discount.value as string), subtotal);
          }
          appliedCode = discount.code;
          await db.update(discountsTable).set({ usedCount: discount.usedCount + 1 }).where(eq(discountsTable.id, discount.id));
        }
      }
    }
  }

  const total = Math.max(0, subtotal - discountAmount);

  const [order] = await db.insert(ordersTable).values({
    userId: adminId,
    status: "delivered",
    subtotal: subtotal.toString(),
    total: total.toString(),
    discountAmount: discountAmount > 0 ? discountAmount.toString() : null,
    discountCode: appliedCode,
    notes: notes || null,
    customerName: customerName || null,
    isPOS: true,
  }).returning();

  await db.insert(orderItemsTable).values(
    orderItemsData.map(i => ({
      orderId: order.id,
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice.toString(),
      subtotal: i.subtotal.toString(),
    }))
  );

  // Decrement stock
  for (const item of orderItemsData) {
    const product = productMap[item.productId];
    await db.update(productsTable).set({ stock: product.stock - item.quantity }).where(eq(productsTable.id, item.productId));
  }

  // Return full order with items
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, adminId)).limit(1);
  const itemsFormatted = await db.select({
    id: orderItemsTable.id,
    productId: orderItemsTable.productId,
    productName: productsTable.name,
    quantity: orderItemsTable.quantity,
    unitPrice: orderItemsTable.unitPrice,
    subtotal: orderItemsTable.subtotal,
  })
    .from(orderItemsTable)
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(eq(orderItemsTable.orderId, order.id));

  res.status(201).json({
    id: order.id,
    userId: order.userId,
    userName: user?.name || "Admin",
    userEmail: user?.email || "",
    status: order.status,
    total: parseFloat(order.total as string),
    subtotal: parseFloat(order.subtotal as string),
    discountAmount: order.discountAmount ? parseFloat(order.discountAmount as string) : null,
    discountCode: order.discountCode,
    customerName: order.customerName,
    isPOS: order.isPOS,
    notes: order.notes,
    shippingAddress: null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: itemsFormatted.map(i => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: parseFloat(i.unitPrice as string),
      subtotal: parseFloat(i.subtotal as string),
    })),
  });
});

export default router;
