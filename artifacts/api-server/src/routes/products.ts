import { Router } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";

const router = Router();

function formatProduct(p: any) {
  return {
    ...p,
    price: parseFloat(p.price as string),
    expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  };
}

const productSelect = {
  id: productsTable.id,
  name: productsTable.name,
  description: productsTable.description,
  price: productsTable.price,
  stock: productsTable.stock,
  sku: productsTable.sku,
  imageUrl: productsTable.imageUrl,
  categoryId: productsTable.categoryId,
  categoryName: categoriesTable.name,
  isActive: productsTable.isActive,
  expiresAt: productsTable.expiresAt,
  createdAt: productsTable.createdAt,
};

router.get("/", async (req, res) => {
  const { categoryId, search, page = "1", limit = "20" } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (categoryId) conditions.push(eq(productsTable.categoryId, parseInt(categoryId as string)));
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [products, countResult] = await Promise.all([
    db.select(productSelect)
      .from(productsTable)
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(whereClause)
      .orderBy(productsTable.name)
      .limit(limitNum)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(whereClause),
  ]);

  res.json({
    products: products.map(formatProduct),
    total: countResult[0]?.count ?? 0,
    page: pageNum,
    limit: limitNum,
  });
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [product] = await db.select(productSelect)
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .where(eq(productsTable.id, id))
    .limit(1);

  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(formatProduct(product));
});

router.post("/", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { name, description, price, stock, sku, imageUrl, categoryId, isActive, expiresAt } = req.body;
  if (!name || price === undefined || stock === undefined) {
    res.status(400).json({ error: "Name, price and stock are required" }); return;
  }
  const [product] = await db.insert(productsTable).values({
    name,
    description: description || null,
    price: price.toString(),
    stock: parseInt(stock),
    sku: sku || null,
    imageUrl: imageUrl || null,
    categoryId: categoryId ? parseInt(categoryId) : null,
    isActive: isActive !== undefined ? isActive : true,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();
  res.status(201).json(formatProduct({ ...product, categoryName: null }));
});

router.put("/:id", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const id = parseInt(req.params.id);
  const { name, description, price, stock, sku, imageUrl, categoryId, isActive, expiresAt } = req.body;
  const [product] = await db.update(productsTable).set({
    name,
    description: description || null,
    price: price?.toString(),
    stock: stock !== undefined ? parseInt(stock) : undefined,
    sku: sku || null,
    imageUrl: imageUrl || null,
    categoryId: categoryId ? parseInt(categoryId) : null,
    isActive,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    updatedAt: new Date(),
  }).where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(formatProduct({ ...product, categoryName: null }));
});

router.delete("/:id", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const id = parseInt(req.params.id);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.json({ message: "Product deleted" });
});

export default router;
