import { Router } from "express";
import { db, usersTable, ordersTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { createHash } from "crypto";

function hashPassword(p: string): string {
  return createHash("sha256").update(p + "dist_salt_2024").digest("hex");
}

const router = Router();

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return false; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return false; }
  return true;
}

router.post("/users", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { name, email, password, phone, address } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email and password are required" }); return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" }); return;
  }
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash: hashPassword(password),
    role: "admin",
    phone: phone || null,
    address: address || null,
  }).returning();
  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    createdAt: user.createdAt.toISOString(),
  });
});

router.delete("/users/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  const currentUserId = (req.session as any).userId;
  if (id === currentUserId) {
    res.status(400).json({ error: "Cannot delete your own account" }); return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ message: "User deleted" });
});

router.get("/users", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { page = "1", limit = "20" } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  const [users, countResult] = await Promise.all([
    db.select().from(usersTable).orderBy(usersTable.createdAt).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable),
  ]);

  res.json({
    users: users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      phone: u.phone,
      address: u.address,
      createdAt: u.createdAt.toISOString(),
    })),
    total: countResult[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

router.get("/stats", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;

  const [
    ordersCount,
    revenueResult,
    productsCount,
    usersCount,
    pendingCount,
    recentOrdersRaw,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(ordersTable),
    db.select({ total: sql<number>`coalesce(sum(total::numeric), 0)` }).from(ordersTable).where(eq(ordersTable.status, "delivered")),
    db.select({ count: sql<number>`count(*)::int` }).from(productsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.role, "customer")),
    db.select({ count: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.status, "pending")),
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
      .orderBy(sql`${ordersTable.createdAt} DESC`)
      .limit(5),
  ]);

  res.json({
    totalOrders: ordersCount[0]?.count ?? 0,
    totalRevenue: parseFloat(String(revenueResult[0]?.total ?? 0)),
    totalProducts: productsCount[0]?.count ?? 0,
    totalUsers: usersCount[0]?.count ?? 0,
    pendingOrders: pendingCount[0]?.count ?? 0,
    recentOrders: recentOrdersRaw.map(o => ({
      ...o,
      total: parseFloat(o.total as string),
      createdAt: o.createdAt!.toISOString(),
      updatedAt: o.updatedAt!.toISOString(),
      items: [],
    })),
  });
});

export default router;
