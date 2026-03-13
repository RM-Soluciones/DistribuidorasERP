import { Router } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const categories = await db.select().from(categoriesTable).orderBy(categoriesTable.name);
  res.json(categories.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: "Name is required" }); return; }
  const [cat] = await db.insert(categoriesTable).values({ name, description: description || null }).returning();
  res.status(201).json({ id: cat.id, name: cat.name, description: cat.description, createdAt: cat.createdAt.toISOString() });
});

router.put("/:id", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const id = parseInt(req.params.id);
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: "Name is required" }); return; }
  const [cat] = await db.update(categoriesTable).set({ name, description: description || null, updatedAt: new Date() }).where(eq(categoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  res.json({ id: cat.id, name: cat.name, description: cat.description, createdAt: cat.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const userId = (req.session as any).userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const id = parseInt(req.params.id);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.json({ message: "Category deleted" });
});

export default router;
