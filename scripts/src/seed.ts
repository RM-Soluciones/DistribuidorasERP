import { db, categoriesTable, productsTable, usersTable } from "@workspace/db";
import { createHash } from "crypto";

function hashPassword(p: string): string {
  return createHash("sha256").update(p + "dist_salt_2024").digest("hex");
}

async function seed() {
  // Create admin user
  await db.insert(usersTable).values({
    name: "Administrador",
    email: "admin@distribuidora.com",
    passwordHash: hashPassword("admin123"),
    role: "admin",
    phone: "+1-555-0001",
    address: "Av. Principal 123",
  }).onConflictDoNothing();
  console.log("Admin user: admin@distribuidora.com / admin123");

  // Create demo customer
  await db.insert(usersTable).values({
    name: "Cliente Demo",
    email: "cliente@ejemplo.com",
    passwordHash: hashPassword("cliente123"),
    role: "customer",
    phone: "+1-555-0002",
    address: "Calle Secundaria 456",
  }).onConflictDoNothing();
  console.log("Demo customer: cliente@ejemplo.com / cliente123");

  // Create categories
  const cats = await db.insert(categoriesTable).values([
    { name: "Bebidas", description: "Aguas, jugos, refrescos y más" },
    { name: "Lácteos", description: "Leche, queso, yogurt" },
    { name: "Alimentos Secos", description: "Granos, harinas, cereales" },
    { name: "Snacks", description: "Galletas, frituras, chocolates" },
    { name: "Higiene", description: "Productos de limpieza personal" },
    { name: "Limpieza", description: "Productos de limpieza del hogar" },
  ]).returning().onConflictDoNothing();
  console.log(`Categories created: ${cats.length}`);

  const catMap: Record<string, number> = Object.fromEntries(cats.map(c => [c.name, c.id]));

  await db.insert(productsTable).values([
    { name: "Agua Mineral 500ml", price: "0.75", stock: 500, sku: "BEB-001", categoryId: catMap["Bebidas"], description: "Agua mineral natural" },
    { name: "Agua Mineral 1.5L", price: "1.20", stock: 300, sku: "BEB-002", categoryId: catMap["Bebidas"], description: "Agua mineral grande" },
    { name: "Jugo de Naranja 1L", price: "2.50", stock: 200, sku: "BEB-003", categoryId: catMap["Bebidas"], description: "Jugo 100% natural" },
    { name: "Refresco Cola 355ml", price: "0.90", stock: 400, sku: "BEB-004", categoryId: catMap["Bebidas"], description: "Refresco de cola" },
    { name: "Leche Entera 1L", price: "1.80", stock: 250, sku: "LAC-001", categoryId: catMap["Lácteos"], description: "Leche entera pasteurizada" },
    { name: "Yogurt Natural 500g", price: "2.20", stock: 150, sku: "LAC-002", categoryId: catMap["Lácteos"], description: "Yogurt natural sin azúcar" },
    { name: "Queso Blanco 250g", price: "3.50", stock: 100, sku: "LAC-003", categoryId: catMap["Lácteos"], description: "Queso fresco blanco" },
    { name: "Arroz Blanco 1kg", price: "1.50", stock: 600, sku: "ALI-001", categoryId: catMap["Alimentos Secos"], description: "Arroz blanco de grano largo" },
    { name: "Frijoles Negros 1kg", price: "2.00", stock: 400, sku: "ALI-002", categoryId: catMap["Alimentos Secos"], description: "Frijoles negros seleccionados" },
    { name: "Harina de Trigo 1kg", price: "1.30", stock: 350, sku: "ALI-003", categoryId: catMap["Alimentos Secos"], description: "Harina de trigo todo uso" },
    { name: "Avena 500g", price: "1.80", stock: 200, sku: "ALI-004", categoryId: catMap["Alimentos Secos"], description: "Avena en hojuelas" },
    { name: "Galletas de Soda", price: "1.20", stock: 300, sku: "SNA-001", categoryId: catMap["Snacks"], description: "Galletas de soda clásicas" },
    { name: "Papas Fritas 150g", price: "2.50", stock: 200, sku: "SNA-002", categoryId: catMap["Snacks"], description: "Papas fritas crujientes" },
    { name: "Chocolate con Leche 50g", price: "1.00", stock: 400, sku: "SNA-003", categoryId: catMap["Snacks"], description: "Chocolate con leche suave" },
    { name: "Shampoo 400ml", price: "4.50", stock: 150, sku: "HIG-001", categoryId: catMap["Higiene"], description: "Shampoo para todo tipo de cabello" },
    { name: "Jabón de Baño", price: "0.80", stock: 500, sku: "HIG-002", categoryId: catMap["Higiene"], description: "Jabón de baño hidratante" },
    { name: "Pasta de Dientes 100g", price: "2.00", stock: 300, sku: "HIG-003", categoryId: catMap["Higiene"], description: "Pasta dental con flúor" },
    { name: "Detergente en Polvo 1kg", price: "5.00", stock: 200, sku: "LIM-001", categoryId: catMap["Limpieza"], description: "Detergente multiusos" },
    { name: "Lavavajillas 500ml", price: "2.80", stock: 250, sku: "LIM-002", categoryId: catMap["Limpieza"], description: "Lavavajillas líquido concentrado" },
    { name: "Desinfectante 1L", price: "3.50", stock: 180, sku: "LIM-003", categoryId: catMap["Limpieza"], description: "Desinfectante multiusos pino" },
  ]).onConflictDoNothing();
  console.log("Products seeded");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
