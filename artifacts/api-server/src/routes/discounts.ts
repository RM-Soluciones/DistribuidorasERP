import { Router } from "express";
import { db, discountsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return false; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return false; }
  return true;
}

function formatDiscount(d: any) {
  return {
    id: d.id,
    code: d.code,
    name: d.name,
    type: d.type,
    value: parseFloat(d.value),
    minOrderAmount: d.minOrderAmount ? parseFloat(d.minOrderAmount) : null,
    maxUses: d.maxUses,
    usedCount: d.usedCount,
    isActive: d.isActive,
    expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
  };
}

// Public router — mounted at /discounts
export const publicDiscountsRouter = Router();

publicDiscountsRouter.post("/validate", async (req, res) => {
  const { code, orderAmount } = req.body;
  if (!code) { res.json({ valid: false, discountAmount: 0, message: "No se proporcionó código" }); return; }

  const [discount] = await db.select().from(discountsTable).where(eq(discountsTable.code, code.toUpperCase())).limit(1);

  if (!discount || !discount.isActive) {
    res.json({ valid: false, discountAmount: 0, message: "Código de descuento inválido o inactivo" }); return;
  }
  if (discount.expiresAt && discount.expiresAt < new Date()) {
    res.json({ valid: false, discountAmount: 0, message: "Este código ha expirado" }); return;
  }
  if (discount.maxUses && discount.usedCount >= discount.maxUses) {
    res.json({ valid: false, discountAmount: 0, message: "Este código ha alcanzado su límite de usos" }); return;
  }
  if (discount.minOrderAmount && orderAmount < parseFloat(discount.minOrderAmount as string)) {
    res.json({ valid: false, discountAmount: 0, message: `Monto mínimo requerido: $${parseFloat(discount.minOrderAmount as string).toFixed(2)}` }); return;
  }

  let discountAmount = 0;
  if (discount.type === "percentage") {
    discountAmount = (orderAmount * parseFloat(discount.value as string)) / 100;
  } else {
    discountAmount = Math.min(parseFloat(discount.value as string), orderAmount);
  }

  res.json({
    valid: true,
    discount: formatDiscount(discount),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    message: `Descuento aplicado: -$${discountAmount.toFixed(2)}`,
  });
});

// Admin router — mounted at /admin/discounts
export const adminDiscountsRouter = Router();

adminDiscountsRouter.get("/", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const discounts = await db.select().from(discountsTable).orderBy(discountsTable.createdAt);
  res.json(discounts.map(formatDiscount));
});

adminDiscountsRouter.post("/", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { code, name, type, value, minOrderAmount, maxUses, isActive, expiresAt } = req.body;
  if (!code || !name || !type || value === undefined) {
    res.status(400).json({ error: "Código, nombre, tipo y valor son obligatorios" }); return;
  }
  const [discount] = await db.insert(discountsTable).values({
    code: code.toUpperCase(),
    name,
    type,
    value: value.toString(),
    minOrderAmount: minOrderAmount ? minOrderAmount.toString() : null,
    maxUses: maxUses || null,
    isActive: isActive !== undefined ? isActive : true,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();
  res.status(201).json(formatDiscount(discount));
});

adminDiscountsRouter.put("/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  const { code, name, type, value, minOrderAmount, maxUses, isActive, expiresAt } = req.body;
  const [discount] = await db.update(discountsTable).set({
    ...(code && { code: code.toUpperCase() }),
    ...(name && { name }),
    ...(type && { type }),
    ...(value !== undefined && { value: value.toString() }),
    minOrderAmount: minOrderAmount ? minOrderAmount.toString() : null,
    maxUses: maxUses || null,
    ...(isActive !== undefined && { isActive }),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    updatedAt: new Date(),
  }).where(eq(discountsTable.id, id)).returning();
  if (!discount) { res.status(404).json({ error: "Descuento no encontrado" }); return; }
  res.json(formatDiscount(discount));
});

adminDiscountsRouter.delete("/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  await db.delete(discountsTable).where(eq(discountsTable.id, id));
  res.json({ message: "Descuento eliminado" });
});
