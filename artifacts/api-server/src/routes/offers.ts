import { Router } from "express";
import { db, offersTable, offerProductsTable, productsTable, usersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const userId = req.session?.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return false; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return false; }
  return true;
}

async function getOfferWithProducts(offerId: number) {
  const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, offerId)).limit(1);
  if (!offer) return null;
  const offerProducts = await db.select({
    productId: offerProductsTable.productId,
    productName: productsTable.name,
    minQuantity: offerProductsTable.minQuantity,
  })
    .from(offerProductsTable)
    .leftJoin(productsTable, eq(offerProductsTable.productId, productsTable.id))
    .where(eq(offerProductsTable.offerId, offerId));
  return {
    id: offer.id,
    name: offer.name,
    description: offer.description,
    type: offer.type,
    value: parseFloat(offer.value as string),
    minTotalQuantity: offer.minTotalQuantity,
    isActive: offer.isActive,
    expiresAt: offer.expiresAt ? offer.expiresAt.toISOString() : null,
    createdAt: offer.createdAt.toISOString(),
    products: offerProducts,
  };
}

export const adminOffersRouter = Router();
export const publicOffersRouter = Router();

adminOffersRouter.get("/", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const offers = await db.select().from(offersTable).orderBy(offersTable.createdAt);
  const result = await Promise.all(offers.map(o => getOfferWithProducts(o.id)));
  res.json(result.filter(Boolean));
});

adminOffersRouter.post("/", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { name, description, type, value, minTotalQuantity, isActive, expiresAt, products } = req.body;
  if (!name || !type || value === undefined || !products?.length) {
    res.status(400).json({ error: "Nombre, tipo, valor y al menos un producto son requeridos" }); return;
  }
  const [offer] = await db.insert(offersTable).values({
    name, description: description || null, type, value: value.toString(),
    minTotalQuantity: minTotalQuantity || null,
    isActive: isActive !== undefined ? isActive : true,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();
  await db.insert(offerProductsTable).values(
    products.map((p: any) => ({ offerId: offer.id, productId: p.productId, minQuantity: p.minQuantity || 1 }))
  );
  const full = await getOfferWithProducts(offer.id);
  res.status(201).json(full);
});

adminOffersRouter.put("/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  const { name, description, type, value, minTotalQuantity, isActive, expiresAt, products } = req.body;
  await db.update(offersTable).set({
    name, description: description || null, type, value: value?.toString(),
    minTotalQuantity: minTotalQuantity || null, isActive,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    updatedAt: new Date(),
  }).where(eq(offersTable.id, id));
  if (products?.length) {
    await db.delete(offerProductsTable).where(eq(offerProductsTable.offerId, id));
    await db.insert(offerProductsTable).values(
      products.map((p: any) => ({ offerId: id, productId: p.productId, minQuantity: p.minQuantity || 1 }))
    );
  }
  const full = await getOfferWithProducts(id);
  if (!full) { res.status(404).json({ error: "Oferta no encontrada" }); return; }
  res.json(full);
});

adminOffersRouter.delete("/:id", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const id = parseInt(req.params.id);
  await db.delete(offersTable).where(eq(offersTable.id, id));
  res.json({ message: "Oferta eliminada" });
});

// Public: check applicable offers for a cart
publicOffersRouter.post("/check", async (req, res) => {
  const { items } = req.body;
  if (!items?.length) { res.json([]); return; }

  const now = new Date();
  const activeOffers = await db.select().from(offersTable)
    .where(eq(offersTable.isActive, true));

  const applicableOffers = [];
  for (const offer of activeOffers) {
    if (offer.expiresAt && offer.expiresAt < now) continue;
    const offerProds = await db.select().from(offerProductsTable).where(eq(offerProductsTable.offerId, offer.id));
    if (!offerProds.length) continue;

    // Check if all required products are in cart with sufficient qty
    let allMet = true;
    let totalQtyInvolved = 0;
    for (const op of offerProds) {
      const cartItem = items.find((i: any) => i.productId === op.productId);
      if (!cartItem || cartItem.quantity < op.minQuantity) { allMet = false; break; }
      totalQtyInvolved += cartItem.quantity;
    }
    if (!allMet) continue;

    // Check minTotalQuantity
    if (offer.minTotalQuantity && totalQtyInvolved < offer.minTotalQuantity) continue;

    // Calculate discount
    const productIds = offerProds.map(p => p.productId);
    const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
    const cartSubtotal = items
      .filter((i: any) => productIds.includes(i.productId))
      .reduce((sum: number, i: any) => {
        const p = products.find(pr => pr.id === i.productId);
        return sum + (p ? parseFloat(p.price as string) * i.quantity : 0);
      }, 0);

    let discountAmount = 0;
    let desc = "";
    const val = parseFloat(offer.value as string);
    if (offer.type === "percentage") {
      discountAmount = (cartSubtotal * val) / 100;
      desc = `${val}% de descuento en combo`;
    } else if (offer.type === "fixed_amount") {
      discountAmount = Math.min(val, cartSubtotal);
      desc = `$${val.toFixed(2)} de descuento en combo`;
    } else if (offer.type === "bundle_price") {
      discountAmount = Math.max(0, cartSubtotal - val);
      desc = `Precio especial de combo: $${val.toFixed(2)}`;
    }

    if (discountAmount > 0) {
      applicableOffers.push({
        offerId: offer.id,
        offerName: offer.name,
        offerType: offer.type,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        description: offer.description || desc,
      });
    }
  }

  res.json(applicableOffers);
});
