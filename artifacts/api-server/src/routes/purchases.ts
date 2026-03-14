import { Router } from "express";
import {
  db, purchasesTable, purchaseItemsTable, supplierPaymentsTable,
  suppliersTable, paymentMethodsTable, productsTable, usersTable
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return false; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return false; }
  return true;
}

async function getPurchaseWithDetails(purchaseId: number) {
  const [purchase] = await db.select({
    id: purchasesTable.id,
    supplierId: purchasesTable.supplierId,
    supplierName: suppliersTable.name,
    invoiceNumber: purchasesTable.invoiceNumber,
    purchaseDate: purchasesTable.purchaseDate,
    totalAmount: purchasesTable.totalAmount,
    paidAmount: purchasesTable.paidAmount,
    status: purchasesTable.status,
    notes: purchasesTable.notes,
    createdAt: purchasesTable.createdAt,
  }).from(purchasesTable)
    .leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
    .where(eq(purchasesTable.id, purchaseId))
    .limit(1);

  if (!purchase) return null;

  const items = await db.select({
    id: purchaseItemsTable.id,
    productId: purchaseItemsTable.productId,
    productName: productsTable.name,
    quantity: purchaseItemsTable.quantity,
    purchasePrice: purchaseItemsTable.purchasePrice,
    salePrice: purchaseItemsTable.salePrice,
    expiresAt: purchaseItemsTable.expiresAt,
  }).from(purchaseItemsTable)
    .leftJoin(productsTable, eq(purchaseItemsTable.productId, productsTable.id))
    .where(eq(purchaseItemsTable.purchaseId, purchaseId));

  const payments = await db.select({
    id: supplierPaymentsTable.id,
    purchaseId: supplierPaymentsTable.purchaseId,
    supplierId: supplierPaymentsTable.supplierId,
    amount: supplierPaymentsTable.amount,
    paymentMethodId: supplierPaymentsTable.paymentMethodId,
    paymentMethodName: paymentMethodsTable.name,
    notes: supplierPaymentsTable.notes,
    paidAt: supplierPaymentsTable.paidAt,
    createdAt: supplierPaymentsTable.createdAt,
  }).from(supplierPaymentsTable)
    .leftJoin(paymentMethodsTable, eq(supplierPaymentsTable.paymentMethodId, paymentMethodsTable.id))
    .where(eq(supplierPaymentsTable.purchaseId, purchaseId));

  const totalAmount = parseFloat(purchase.totalAmount as string);
  const paidAmount = parseFloat(purchase.paidAmount as string);

  return {
    id: purchase.id,
    supplierId: purchase.supplierId,
    supplierName: purchase.supplierName || "",
    invoiceNumber: purchase.invoiceNumber,
    purchaseDate: purchase.purchaseDate.toISOString(),
    totalAmount,
    paidAmount,
    balance: totalAmount - paidAmount,
    status: purchase.status,
    notes: purchase.notes,
    createdAt: purchase.createdAt.toISOString(),
    items: items.map(i => {
      const pp = parseFloat(i.purchasePrice as string);
      const sp = parseFloat(i.salePrice as string);
      return {
        id: i.id, productId: i.productId, productName: i.productName,
        quantity: i.quantity, purchasePrice: pp, salePrice: sp,
        margin: sp > 0 ? parseFloat(((sp - pp) / sp * 100).toFixed(2)) : 0,
        expiresAt: i.expiresAt ? i.expiresAt.toISOString() : null,
      };
    }),
    payments: payments.map(p => ({
      id: p.id, purchaseId: p.purchaseId, supplierId: p.supplierId,
      amount: parseFloat(p.amount as string),
      paymentMethodId: p.paymentMethodId, paymentMethodName: p.paymentMethodName,
      notes: p.notes,
      paidAt: p.paidAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

export const purchasesRouter = Router();

purchasesRouter.get("/", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { supplierId, status } = req.query;

  const conditions = [];
  if (supplierId) conditions.push(eq(purchasesTable.supplierId, parseInt(supplierId as string)));
  if (status) conditions.push(eq(purchasesTable.status, status as any));

  const purchases = await db.select({
    id: purchasesTable.id,
    supplierId: purchasesTable.supplierId,
    supplierName: suppliersTable.name,
    invoiceNumber: purchasesTable.invoiceNumber,
    purchaseDate: purchasesTable.purchaseDate,
    totalAmount: purchasesTable.totalAmount,
    paidAmount: purchasesTable.paidAmount,
    status: purchasesTable.status,
    notes: purchasesTable.notes,
    createdAt: purchasesTable.createdAt,
  }).from(purchasesTable)
    .leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(purchasesTable.purchaseDate);

  const purchaseIds = purchases.map(p => p.id);
  let itemsMap: Record<number, any[]> = {};
  let paymentsMap: Record<number, any[]> = {};

  if (purchaseIds.length) {
    const allItems = await db.select({
      id: purchaseItemsTable.id,
      purchaseId: purchaseItemsTable.purchaseId,
      productId: purchaseItemsTable.productId,
      productName: productsTable.name,
      quantity: purchaseItemsTable.quantity,
      purchasePrice: purchaseItemsTable.purchasePrice,
      salePrice: purchaseItemsTable.salePrice,
      expiresAt: purchaseItemsTable.expiresAt,
    }).from(purchaseItemsTable)
      .leftJoin(productsTable, eq(purchaseItemsTable.productId, productsTable.id))
      .where(inArray(purchaseItemsTable.purchaseId, purchaseIds));

    for (const i of allItems) {
      if (!itemsMap[i.purchaseId]) itemsMap[i.purchaseId] = [];
      const pp = parseFloat(i.purchasePrice as string);
      const sp = parseFloat(i.salePrice as string);
      itemsMap[i.purchaseId].push({
        id: i.id, productId: i.productId, productName: i.productName,
        quantity: i.quantity, purchasePrice: pp, salePrice: sp,
        margin: sp > 0 ? parseFloat(((sp - pp) / sp * 100).toFixed(2)) : 0,
        expiresAt: i.expiresAt ? i.expiresAt.toISOString() : null,
      });
    }

    const allPayments = await db.select({
      id: supplierPaymentsTable.id,
      purchaseId: supplierPaymentsTable.purchaseId,
      supplierId: supplierPaymentsTable.supplierId,
      amount: supplierPaymentsTable.amount,
      paymentMethodId: supplierPaymentsTable.paymentMethodId,
      paymentMethodName: paymentMethodsTable.name,
      notes: supplierPaymentsTable.notes,
      paidAt: supplierPaymentsTable.paidAt,
      createdAt: supplierPaymentsTable.createdAt,
    }).from(supplierPaymentsTable)
      .leftJoin(paymentMethodsTable, eq(supplierPaymentsTable.paymentMethodId, paymentMethodsTable.id))
      .where(inArray(supplierPaymentsTable.purchaseId, purchaseIds));

    for (const p of allPayments) {
      if (!paymentsMap[p.purchaseId]) paymentsMap[p.purchaseId] = [];
      paymentsMap[p.purchaseId].push({
        id: p.id, purchaseId: p.purchaseId, supplierId: p.supplierId,
        amount: parseFloat(p.amount as string),
        paymentMethodId: p.paymentMethodId, paymentMethodName: p.paymentMethodName,
        notes: p.notes,
        paidAt: p.paidAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
      });
    }
  }

  res.json(purchases.map(p => ({
    id: p.id, supplierId: p.supplierId, supplierName: p.supplierName || "",
    invoiceNumber: p.invoiceNumber,
    purchaseDate: p.purchaseDate.toISOString(),
    totalAmount: parseFloat(p.totalAmount as string),
    paidAmount: parseFloat(p.paidAmount as string),
    balance: parseFloat(p.totalAmount as string) - parseFloat(p.paidAmount as string),
    status: p.status, notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    items: itemsMap[p.id] || [],
    payments: paymentsMap[p.id] || [],
  })));
});

purchasesRouter.get("/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  const purchase = await getPurchaseWithDetails(id);
  if (!purchase) { res.status(404).json({ error: "Compra no encontrada" }); return; }
  res.json(purchase);
});

purchasesRouter.post("/", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { supplierId, invoiceNumber, purchaseDate, notes, items, initialPaymentAmount, paymentMethodId } = req.body;
  if (!supplierId || !items?.length) {
    res.status(400).json({ error: "Proveedor y productos son requeridos" }); return;
  }

  const totalAmount = items.reduce((s: number, i: any) => s + i.purchasePrice * i.quantity, 0);
  let paidAmount = 0;

  if (initialPaymentAmount && initialPaymentAmount > 0) {
    paidAmount = Math.min(initialPaymentAmount, totalAmount);
  }

  const status = paidAmount >= totalAmount ? "paid" : paidAmount > 0 ? "partial" : "pending";

  const [purchase] = await db.insert(purchasesTable).values({
    supplierId,
    invoiceNumber: invoiceNumber || null,
    purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
    totalAmount: totalAmount.toString(),
    paidAmount: paidAmount.toString(),
    status,
    notes: notes || null,
  }).returning();

  // Insert items and update product stock + sale price
  for (const item of items) {
    await db.insert(purchaseItemsTable).values({
      purchaseId: purchase.id,
      productId: item.productId,
      quantity: item.quantity,
      purchasePrice: item.purchasePrice.toString(),
      salePrice: item.salePrice.toString(),
      expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
    });

    // Update product: add stock, update sale price and expiresAt
    const [prod] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId)).limit(1);
    if (prod) {
      await db.update(productsTable).set({
        stock: prod.stock + item.quantity,
        price: item.salePrice.toString(),
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : prod.expiresAt,
        updatedAt: new Date(),
      }).where(eq(productsTable.id, item.productId));
    }
  }

  // Record initial payment
  if (paidAmount > 0) {
    await db.insert(supplierPaymentsTable).values({
      purchaseId: purchase.id,
      supplierId,
      amount: paidAmount.toString(),
      paymentMethodId: paymentMethodId || null,
      notes: "Pago inicial",
      paidAt: new Date(),
    });
  }

  const full = await getPurchaseWithDetails(purchase.id);
  res.status(201).json(full);
});

purchasesRouter.put("/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  const { invoiceNumber, purchaseDate, notes, status } = req.body;
  await db.update(purchasesTable).set({
    invoiceNumber: invoiceNumber || null,
    purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
    notes: notes || null,
    ...(status && { status }),
    updatedAt: new Date(),
  }).where(eq(purchasesTable.id, id));
  const full = await getPurchaseWithDetails(id);
  if (!full) { res.status(404).json({ error: "Compra no encontrada" }); return; }
  res.json(full);
});

purchasesRouter.post("/:id/payments", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  const { amount, paymentMethodId, notes } = req.body;
  if (!amount || amount <= 0) { res.status(400).json({ error: "Monto es requerido y debe ser positivo" }); return; }

  const [purchase] = await db.select().from(purchasesTable).where(eq(purchasesTable.id, id)).limit(1);
  if (!purchase) { res.status(404).json({ error: "Compra no encontrada" }); return; }

  const currentPaid = parseFloat(purchase.paidAmount as string);
  const total = parseFloat(purchase.totalAmount as string);
  const newPaid = Math.min(currentPaid + amount, total);
  const newStatus = newPaid >= total ? "paid" : "partial";

  await db.update(purchasesTable).set({
    paidAmount: newPaid.toString(),
    status: newStatus,
    updatedAt: new Date(),
  }).where(eq(purchasesTable.id, id));

  await db.insert(supplierPaymentsTable).values({
    purchaseId: id,
    supplierId: purchase.supplierId,
    amount: amount.toString(),
    paymentMethodId: paymentMethodId || null,
    notes: notes || null,
    paidAt: new Date(),
  });

  const full = await getPurchaseWithDetails(id);
  res.status(201).json(full);
});
