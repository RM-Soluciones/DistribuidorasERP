import { Router } from "express";
import { db, paymentMethodsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return false; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return false; }
  return true;
}

export const paymentMethodsRouter = Router();

paymentMethodsRouter.get("/", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const methods = await db.select().from(paymentMethodsTable).orderBy(paymentMethodsTable.name);
  res.json(methods.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

paymentMethodsRouter.post("/", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { name, type, isActive } = req.body;
  if (!name || !type) { res.status(400).json({ error: "Nombre y tipo son requeridos" }); return; }
  const [method] = await db.insert(paymentMethodsTable).values({
    name, type, isActive: isActive !== undefined ? isActive : true,
  }).returning();
  res.status(201).json({ ...method, createdAt: method.createdAt.toISOString() });
});

paymentMethodsRouter.put("/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  const { name, type, isActive } = req.body;
  const [method] = await db.update(paymentMethodsTable).set({ name, type, isActive })
    .where(eq(paymentMethodsTable.id, id)).returning();
  if (!method) { res.status(404).json({ error: "Medio de pago no encontrado" }); return; }
  res.json({ ...method, createdAt: method.createdAt.toISOString() });
});

paymentMethodsRouter.delete("/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  await db.delete(paymentMethodsTable).where(eq(paymentMethodsTable.id, id));
  res.json({ message: "Medio de pago eliminado" });
});
