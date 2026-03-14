import { Router } from "express";
import {
  db, suppliersTable, purchasesTable, purchaseItemsTable,
  supplierPaymentsTable, paymentMethodsTable, productsTable, usersTable
} from "@workspace/db";
import { eq, sql, inArray } from "drizzle-orm";

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return false; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return false; }
  return true;
}

async function getSupplierDebt(supplierId: number): Promise<number> {
  const result = await db.select({
    totalAmount: sql<number>`COALESCE(SUM(${purchasesTable.totalAmount}::numeric), 0)`,
    paidAmount: sql<number>`COALESCE(SUM(${purchasesTable.paidAmount}::numeric), 0)`,
  }).from(purchasesTable).where(eq(purchasesTable.supplierId, supplierId));
  return parseFloat((result[0]?.totalAmount || 0) as any) - parseFloat((result[0]?.paidAmount || 0) as any);
}

function formatSupplier(s: any, totalDebt = 0) {
  return {
    id: s.id, name: s.name, contactName: s.contactName, phone: s.phone,
    email: s.email, address: s.address, taxId: s.taxId, notes: s.notes,
    isActive: s.isActive, totalDebt,
    createdAt: s.createdAt.toISOString(),
  };
}

export const suppliersRouter = Router();

suppliersRouter.get("/", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const suppliers = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
  const result = await Promise.all(suppliers.map(async s => {
    const debt = await getSupplierDebt(s.id);
    return formatSupplier(s, debt);
  }));
  res.json(result);
});

suppliersRouter.get("/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id)).limit(1);
  if (!supplier) { res.status(404).json({ error: "Proveedor no encontrado" }); return; }
  const debt = await getSupplierDebt(id);

  const purchases = await db.select().from(purchasesTable).where(eq(purchasesTable.supplierId, id)).orderBy(sql`${purchasesTable.purchaseDate} DESC`);
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

  const formattedPurchases = purchases.map(p => ({
    id: p.id, supplierId: p.supplierId, supplierName: supplier.name,
    invoiceNumber: p.invoiceNumber,
    purchaseDate: p.purchaseDate.toISOString(),
    totalAmount: parseFloat(p.totalAmount as string),
    paidAmount: parseFloat(p.paidAmount as string),
    balance: parseFloat(p.totalAmount as string) - parseFloat(p.paidAmount as string),
    status: p.status, notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    items: itemsMap[p.id] || [],
    payments: paymentsMap[p.id] || [],
  }));

  const allPayments = Object.values(paymentsMap).flat();

  res.json({
    ...formatSupplier(supplier, debt),
    purchases: formattedPurchases,
    payments: allPayments,
  });
});

suppliersRouter.post("/", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { name, contactName, phone, email, address, taxId, notes, isActive } = req.body;
  if (!name) { res.status(400).json({ error: "Nombre es requerido" }); return; }
  const [supplier] = await db.insert(suppliersTable).values({
    name, contactName: contactName || null, phone: phone || null, email: email || null,
    address: address || null, taxId: taxId || null, notes: notes || null,
    isActive: isActive !== undefined ? isActive : true,
  }).returning();
  res.status(201).json(formatSupplier(supplier, 0));
});

suppliersRouter.put("/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  const { name, contactName, phone, email, address, taxId, notes, isActive } = req.body;
  const [supplier] = await db.update(suppliersTable).set({
    name, contactName: contactName || null, phone: phone || null, email: email || null,
    address: address || null, taxId: taxId || null, notes: notes || null,
    isActive, updatedAt: new Date(),
  }).where(eq(suppliersTable.id, id)).returning();
  if (!supplier) { res.status(404).json({ error: "Proveedor no encontrado" }); return; }
  const debt = await getSupplierDebt(id);
  res.json(formatSupplier(supplier, debt));
});

suppliersRouter.delete("/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  await db.delete(suppliersTable).where(eq(suppliersTable.id, id));
  res.json({ message: "Proveedor eliminado" });
});
