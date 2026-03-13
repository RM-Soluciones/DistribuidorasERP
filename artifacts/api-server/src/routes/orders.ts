import { Router } from "express";
import { db, ordersTable, orderItemsTable, usersTable, productsTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";

const router = Router();

async function getOrderWithItems(orderId: number) {
  const [order] = await db.select({
    id: ordersTable.id,
    userId: ordersTable.userId,
    userName: usersTable.name,
    userEmail: usersTable.email,
    status: ordersTable.status,
    total: ordersTable.total,
    notes: ordersTable.notes,
    shippingAddress: ordersTable.shippingAddress,
    createdAt: ordersTable.createdAt,
    updatedAt: ordersTable.updatedAt,
  })
    .from(ordersTable)
    .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order) return null;

  const items = await db.select({
    id: orderItemsTable.id,
    productId: orderItemsTable.productId,
    productName: productsTable.name,
    quantity: orderItemsTable.quantity,
    unitPrice: orderItemsTable.unitPrice,
    subtotal: orderItemsTable.subtotal,
  })
    .from(orderItemsTable)
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(eq(orderItemsTable.orderId, orderId));

  return {
    ...order,
    total: parseFloat(order.total as string),
    createdAt: order.createdAt!.toISOString(),
    updatedAt: order.updatedAt!.toISOString(),
    items: items.map(i => ({
      ...i,
      unitPrice: parseFloat(i.unitPrice as string),
      subtotal: parseFloat(i.subtotal as string),
    })),
  };
}

router.get("/", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!currentUser) { res.status(401).json({ error: "User not found" }); return; }

  const { status, page = "1", limit = "20" } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (currentUser.role !== "admin") {
    conditions.push(eq(ordersTable.userId, userId));
  }
  if (status) {
    conditions.push(eq(ordersTable.status, status as any));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [orders, countResult] = await Promise.all([
    db.select({
      id: ordersTable.id,
      userId: ordersTable.userId,
      userName: usersTable.name,
      userEmail: usersTable.email,
      status: ordersTable.status,
      total: ordersTable.total,
      notes: ordersTable.notes,
      shippingAddress: ordersTable.shippingAddress,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    })
      .from(ordersTable)
      .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .where(whereClause)
      .orderBy(sql`${ordersTable.createdAt} DESC`)
      .limit(limitNum)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(whereClause),
  ]);

  const orderIds = orders.map(o => o.id);
  let itemsMap: Record<number, any[]> = {};
  if (orderIds.length > 0) {
    const allItems = await db.select({
      id: orderItemsTable.id,
      orderId: orderItemsTable.orderId,
      productId: orderItemsTable.productId,
      productName: productsTable.name,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
      subtotal: orderItemsTable.subtotal,
    })
      .from(orderItemsTable)
      .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
      .where(inArray(orderItemsTable.orderId, orderIds));

    for (const item of allItems) {
      if (!itemsMap[item.orderId]) itemsMap[item.orderId] = [];
      itemsMap[item.orderId].push({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice as string),
        subtotal: parseFloat(item.subtotal as string),
      });
    }
  }

  res.json({
    orders: orders.map(o => ({
      ...o,
      total: parseFloat(o.total as string),
      createdAt: o.createdAt!.toISOString(),
      updatedAt: o.updatedAt!.toISOString(),
      items: itemsMap[o.id] || [],
    })),
    total: countResult[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

router.get("/:id", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const id = parseInt(req.params.id);
  const order = await getOrderWithItems(id);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  if (currentUser?.role !== "admin" && order.userId !== userId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  res.json(order);
});

router.post("/", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { items, notes, shippingAddress } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "At least one item is required" }); return;
  }

  const productIds = items.map((i: any) => i.productId);
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  let total = 0;
  const orderItemsData = [];
  for (const item of items) {
    const product = productMap[item.productId];
    if (!product) { res.status(400).json({ error: `Product ${item.productId} not found` }); return; }
    if (product.stock < item.quantity) {
      res.status(400).json({ error: `Insufficient stock for ${product.name}` }); return;
    }
    const price = parseFloat(product.price as string);
    const subtotal = price * item.quantity;
    total += subtotal;
    orderItemsData.push({ productId: item.productId, quantity: item.quantity, unitPrice: price, subtotal });
  }

  const [order] = await db.insert(ordersTable).values({
    userId,
    status: "pending",
    total: total.toString(),
    notes: notes || null,
    shippingAddress: shippingAddress || null,
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

  const fullOrder = await getOrderWithItems(order.id);
  res.status(201).json(fullOrder);
});

router.put("/:id/status", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (currentUser?.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!status) { res.status(400).json({ error: "Status is required" }); return; }

  await db.update(ordersTable).set({ status, updatedAt: new Date() }).where(eq(ordersTable.id, id));
  const order = await getOrderWithItems(id);
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(order);
});

export default router;
