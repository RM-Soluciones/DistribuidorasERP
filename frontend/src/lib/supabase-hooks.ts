import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Category = {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  sku?: string | null;
  imageUrl?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type OrderItem = {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type Order = {
  id: number;
  userId: number;
  status: OrderStatus;
  total: number;
  subtotal?: number | null;
  discountAmount?: number | null;
  discountCode?: string | null;
  notes?: string | null;
  shippingAddress?: string | null;
  customerName?: string | null;
  isPOS: boolean;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  userName?: string;
  userEmail?: string;
};

export type OrderDelivery = {
  id: number;
  orderId: number;
  assignedTo?: number | null;
  assignedAt: string;
  deliveryDate?: string | null;
  status: string;
  deliveredAt?: string | null;
  notes?: string | null;
  order?: Order;
  driver?: UserRow;
};

export type Discount = {
  id: number;
  code: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Offer = {
  id: number;
  name: string;
  description?: string | null;
  type: "percentage" | "fixed_amount" | "bundle_price";
  value: number;
  minTotalQuantity?: number | null;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
  products: { productId: number; productName: string; minQuantity: number }[];
};

export type Supplier = {
  id: number;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  notes?: string | null;
  isActive: boolean;
  totalDebt?: number;
  createdAt: string;
};

export type Purchase = {
  id: number;
  supplierId: number;
  supplierName?: string;
  invoiceNumber?: string | null;
  purchaseDate: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: "pending" | "partial" | "paid";
  notes?: string | null;
  createdAt: string;
  items?: any[];
  payments?: any[];
};

export type PaymentMethod = {
  id: number;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: string;
};

export type UserRow = {
  id: number;
  name: string;
  email: string;
  role: "customer" | "admin" | "seller" | "delivery";
  phone?: string | null;
  address?: string | null;
  createdAt: string;
};

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapCategory(r: any): Category {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapProduct(r: any): Product {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    price: parseFloat(r.price),
    stock: r.stock,
    sku: r.sku,
    imageUrl: r.image_url,
    categoryId: r.category_id,
    categoryName: r.categories?.name ?? null,
    isActive: r.is_active,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  };
}

function mapOrderItem(r: any): OrderItem {
  return {
    id: r.id,
    orderId: r.order_id,
    productId: r.product_id,
    productName: r.products?.name ?? r.product_name ?? "",
    quantity: r.quantity,
    unitPrice: parseFloat(r.unit_price),
    subtotal: parseFloat(r.subtotal),
  };
}

function mapOrder(r: any): Order {
  return {
    id: r.id,
    userId: r.user_id,
    status: r.status,
    total: parseFloat(r.total),
    subtotal: r.subtotal ? parseFloat(r.subtotal) : null,
    discountAmount: r.discount_amount ? parseFloat(r.discount_amount) : null,
    discountCode: r.discount_code,
    notes: r.notes,
    shippingAddress: r.shipping_address,
    customerName: r.customer_name,
    isPOS: r.is_pos,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    items: (r.order_items || []).map(mapOrderItem),
    userName: r.users?.name,
    userEmail: r.users?.email,
  };
}

function mapOrderDelivery(r: any): OrderDelivery {
  return {
    id: r.id,
    orderId: r.order_id,
    assignedTo: r.assigned_to,
    assignedAt: r.assigned_at,
    deliveryDate: r.delivery_date,
    status: r.status,
    deliveredAt: r.delivered_at,
    notes: r.notes,
    order: r.orders ? mapOrder(r.orders) : undefined,
    driver: r.assigned_to ? mapUser(r.assigned_to) : undefined,
  };
}

function mapDiscount(r: any): Discount {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    type: r.type,
    value: parseFloat(r.value),
    minOrderAmount: r.min_order_amount ? parseFloat(r.min_order_amount) : null,
    maxUses: r.max_uses,
    usedCount: r.used_count,
    isActive: r.is_active,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapOffer(r: any): Offer {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    type: r.type,
    value: parseFloat(r.value),
    minTotalQuantity: r.min_total_quantity,
    isActive: r.is_active,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    products: (r.offer_products || []).map((p: any) => ({
      productId: p.product_id,
      productName: p.products?.name ?? "",
      minQuantity: p.min_quantity,
    })),
  };
}

function mapSupplier(r: any): Supplier {
  const purchases = r.purchases || [];
  const totalDebt = purchases.reduce((s: number, p: any) => {
    return s + Math.max(0, parseFloat(p.total_amount) - parseFloat(p.paid_amount));
  }, 0);
  return {
    id: r.id,
    name: r.name,
    contactName: r.contact_name,
    phone: r.phone,
    email: r.email,
    address: r.address,
    taxId: r.tax_id,
    notes: r.notes,
    isActive: r.is_active,
    totalDebt,
    createdAt: r.created_at,
  };
}

function mapPurchase(r: any): Purchase {
  const total = parseFloat(r.total_amount);
  const paid = parseFloat(r.paid_amount);
  return {
    id: r.id,
    supplierId: r.supplier_id,
    supplierName: r.suppliers?.name,
    invoiceNumber: r.invoice_number,
    purchaseDate: r.purchase_date,
    totalAmount: total,
    paidAmount: paid,
    balance: Math.max(0, total - paid),
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
    items: (r.purchase_items || []).map((i: any) => ({
      id: i.id,
      productId: i.product_id,
      productName: i.products?.name ?? "",
      quantity: i.quantity,
      purchasePrice: parseFloat(i.purchase_price),
      salePrice: parseFloat(i.sale_price),
      expiresAt: i.expires_at,
    })),
    payments: (r.supplier_payments || []).map((p: any) => ({
      id: p.id,
      amount: parseFloat(p.amount),
      paymentMethodName: p.payment_methods?.name,
      notes: p.notes,
      paidAt: p.paid_at,
    })),
  };
}

function mapPaymentMethod(r: any): PaymentMethod {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    isActive: r.is_active,
    createdAt: r.created_at,
  };
}

function mapUser(r: any): UserRow {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    phone: r.phone,
    address: r.address,
    createdAt: r.created_at,
  };
}

// ─── Categories ──────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []).map(mapCategory);
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const { error } = await supabase.from("categories").insert({
        name: data.name,
        description: data.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { name: string; description?: string };
    }) => {
      const { error } = await supabase
        .from("categories")
        .update({ name: data.name, description: data.description || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

// ─── Products ─────────────────────────────────────────────────────────────────

export function useProducts(params?: {
  search?: string;
  categoryId?: number;
  limit?: number;
  activeOnly?: boolean;
}) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("*, categories(name)")
        .order("name");

      if (params?.search) {
        q = q.ilike("name", `%${params.search}%`);
      }
      if (params?.categoryId) {
        q = q.eq("category_id", params.categoryId);
      }
      if (params?.activeOnly !== false) {
        q = q.eq("is_active", true);
      }
      if (params?.limit) {
        q = q.limit(params.limit);
      }

      const { data, error, count } = await q;
      if (error) throw error;
      const products = (data || []).map(mapProduct);
      return { products, total: count ?? products.length };
    },
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return mapProduct(data);
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Product> & { name: string; price: number }) => {
      const { error } = await supabase.from("products").insert({
        name: data.name,
        description: data.description || null,
        price: data.price,
        stock: data.stock ?? 0,
        sku: data.sku || null,
        image_url: data.imageUrl || null,
        category_id: data.categoryId || null,
        is_active: data.isActive ?? true,
        expires_at: data.expiresAt || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Product>;
    }) => {
      const { error } = await supabase
        .from("products")
        .update({
          name: data.name,
          description: data.description ?? null,
          price: data.price,
          stock: data.stock,
          sku: data.sku ?? null,
          image_url: data.imageUrl ?? null,
          category_id: data.categoryId ?? null,
          is_active: data.isActive,
          expires_at: data.expiresAt ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export function useOrders(params?: { limit?: number; status?: string }) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select(
          "*, order_items(*, products(name)), users(name, email)"
        )
        .order("created_at", { ascending: false });

      if (params?.status) {
        q = q.eq("status", params.status);
      }
      if (params?.limit) {
        q = q.limit(params.limit);
      }

      const { data, error } = await q;
      if (error) throw error;
      return { orders: (data || []).map(mapOrder) };
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { status: OrderStatus };
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: data.status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useOrderDeliveries(params?: { orderId?: number; assignedTo?: number; deliveryDate?: string; status?: string }) {
  return useQuery({
    queryKey: ["order-deliveries", params],
    queryFn: async () => {
      let q = supabase
        .from("order_deliveries")
        .select(
          "*, orders(*, order_items(*, products(name)), users(name,email)), assigned_to(*)"
        )
        .order("delivery_date", { ascending: true });

      if (params?.orderId) {
        q = q.eq("order_id", params.orderId);
      }
      if (params?.assignedTo) {
        q = q.eq("assigned_to", params.assignedTo);
      }
      if (params?.deliveryDate) {
        q = q.eq("delivery_date", params.deliveryDate);
      }
      if (params?.status) {
        q = q.eq("status", params.status);
      }

      const { data, error } = await q;
      if (error) throw error;
      return { deliveries: (data || []).map(mapOrderDelivery) };
    },
  });
}

export function useAssignOrderDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      orderId: number;
      assignedTo: number;
      deliveryDate?: string;
      status?: string;
      notes?: string;
      deliveredAt?: string;
    }) => {
      const { error } = await supabase
        .from("order_deliveries")
        .upsert(
          {
            order_id: payload.orderId,
            assigned_to: payload.assignedTo,
            delivery_date: payload.deliveryDate || null,
            status: payload.status || "pending",
            delivered_at: payload.deliveredAt || null,
            notes: payload.notes || null,
          },
          { onConflict: "order_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order-deliveries"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: number;
      data: {
        items: { productId: number; quantity: number }[];
        shippingAddress?: string;
        notes?: string;
        discountCode?: string;
      };
    }) => {
      const productIds = data.items.map((i) => i.productId);
      const { data: products, error: prodErr } = await supabase
        .from("products")
        .select("id, price, stock, name")
        .in("id", productIds);
      if (prodErr) throw prodErr;

      const productMap = Object.fromEntries(
        (products || []).map((p) => [p.id, p])
      );

      for (const item of data.items) {
        const p = productMap[item.productId];
        if (!p) throw new Error(`Producto ${item.productId} no encontrado`);
        if (p.stock < item.quantity)
          throw new Error(`Stock insuficiente para ${p.name}`);
      }

      let subtotal = data.items.reduce((s, item) => {
        return s + parseFloat(productMap[item.productId].price) * item.quantity;
      }, 0);

      let discountAmount = 0;
      let appliedCode: string | undefined;

      if (data.discountCode) {
        const { data: disc } = await supabase
          .from("discounts")
          .select("*")
          .eq("code", data.discountCode.toUpperCase())
          .eq("is_active", true)
          .single();
        if (disc) {
          if (disc.type === "percentage") {
            discountAmount = subtotal * (parseFloat(disc.value) / 100);
          } else {
            discountAmount = Math.min(parseFloat(disc.value), subtotal);
          }
          appliedCode = disc.code;
          await supabase
            .from("discounts")
            .update({ used_count: disc.used_count + 1 })
            .eq("id", disc.id);
        }
      }

      const total = Math.max(0, subtotal - discountAmount);

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          status: "pending",
          total,
          subtotal,
          discount_amount: discountAmount || null,
          discount_code: appliedCode || null,
          shipping_address: data.shippingAddress || null,
          notes: data.notes || null,
          is_pos: false,
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      const orderItems = data.items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: parseFloat(productMap[item.productId].price),
        subtotal:
          parseFloat(productMap[item.productId].price) * item.quantity,
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItems);
      if (itemsErr) throw itemsErr;

      for (const item of data.items) {
        const p = productMap[item.productId];
        await supabase
          .from("products")
          .update({ stock: p.stock - item.quantity })
          .eq("id", item.productId);
      }

      return order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ─── Admin Stats ──────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [
        { count: totalOrders },
        { count: pendingOrders },
        { count: totalCustomers },
        { count: totalProducts },
        { data: deliveredOrders },
        { data: recentOrders },
      ] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("role", "customer"),
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        supabase.from("orders").select("total").eq("status", "delivered"),
        supabase
          .from("orders")
          .select("id, status, total, created_at, customer_name, user_id, users(name, email)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const totalRevenue = (deliveredOrders || []).reduce(
        (s: number, o: any) => s + parseFloat(o.total),
        0
      );

      return {
        totalRevenue,
        totalOrders: totalOrders ?? 0,
        pendingOrders: pendingOrders ?? 0,
        totalCustomers: totalCustomers ?? 0,
        totalProducts: totalProducts ?? 0,
        recentOrders: (recentOrders || []).map(mapOrder),
      };
    },
  });
}

// ─── Users ────────────────────────────────────────────────────────────────────

export function useUsers(params?: { limit?: number; role?: string }) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      let q = supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (params?.role) {
        q = q.eq("role", params.role);
      }
      if (params?.limit) q = q.limit(params.limit);
      const { data, error } = await q;
      if (error) throw error;
      return { users: (data || []).map(mapUser) };
    },
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      password?: string;
      role?: "admin" | "seller" | "delivery" | "customer";
      phone?: string;
      address?: string;
    }) => {
      const { error } = await supabase.from("users").upsert(
        {
          name: data.name,
          email: data.email,
          password_hash: "SUPABASE_AUTH",
          role: data.role ?? "admin",
          phone: data.phone || null,
          address: data.address || null,
        },
        { onConflict: "email" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

// ─── Discounts ────────────────────────────────────────────────────────────────

export function useDiscounts() {
  return useQuery({
    queryKey: ["discounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discounts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapDiscount);
    },
  });
}

export function useCreateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Discount> & { name: string; code: string }) => {
      const { error } = await supabase.from("discounts").insert({
        code: payload.code.toUpperCase(),
        name: payload.name,
        type: payload.type ?? "percentage",
        value: payload.value ?? 0,
        min_order_amount: payload.minOrderAmount ?? null,
        max_uses: payload.maxUses ?? null,
        is_active: payload.isActive ?? true,
        expires_at: payload.expiresAt ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useUpdateDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Discount> }) => {
      const { error } = await supabase
        .from("discounts")
        .update({
          code: data.code?.toUpperCase(),
          name: data.name,
          type: data.type,
          value: data.value,
          min_order_amount: data.minOrderAmount ?? null,
          max_uses: data.maxUses ?? null,
          is_active: data.isActive,
          expires_at: data.expiresAt ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useDeleteDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const { error } = await supabase.from("discounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts"] }),
  });
}

export function useValidateDiscount() {
  return useMutation({
    mutationFn: async ({
      data,
    }: {
      data: { code: string; orderAmount: number };
    }) => {
      const { data: discount } = await supabase
        .from("discounts")
        .select("*")
        .eq("code", data.code.toUpperCase())
        .eq("is_active", true)
        .single();

      if (!discount)
        return { valid: false, message: "Código de descuento inválido" };
      if (
        discount.expires_at &&
        new Date(discount.expires_at) < new Date()
      )
        return { valid: false, message: "El código de descuento ha vencido" };
      if (
        discount.max_uses &&
        discount.used_count >= discount.max_uses
      )
        return {
          valid: false,
          message: "El código ha alcanzado su límite de uso",
        };
      if (
        discount.min_order_amount &&
        data.orderAmount < parseFloat(discount.min_order_amount)
      )
        return {
          valid: false,
          message: `Mínimo $${parseFloat(discount.min_order_amount).toFixed(2)} para este código`,
        };

      let discountAmount = 0;
      if (discount.type === "percentage") {
        discountAmount = data.orderAmount * (parseFloat(discount.value) / 100);
      } else {
        discountAmount = Math.min(
          parseFloat(discount.value),
          data.orderAmount
        );
      }

      return {
        valid: true,
        discountAmount,
        message: `${discount.name}: -$${discountAmount.toFixed(2)}`,
        discount,
      };
    },
  });
}

// ─── Offers ──────────────────────────────────────────────────────────────────

export function useOffers() {
  return useQuery({
    queryKey: ["offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*, offer_products(*, products(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapOffer);
    },
  });
}

export function useCreateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      type: string;
      value: number;
      minTotalQuantity?: number;
      isActive: boolean;
      expiresAt?: string;
      products: { productId: number; minQuantity: number }[];
    }) => {
      const { data: offer, error } = await supabase
        .from("offers")
        .insert({
          name: payload.name,
          description: payload.description || null,
          type: payload.type,
          value: payload.value,
          min_total_quantity: payload.minTotalQuantity || null,
          is_active: payload.isActive,
          expires_at: payload.expiresAt || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (payload.products.length > 0) {
        const { error: pErr } = await supabase.from("offer_products").insert(
          payload.products.map((p) => ({
            offer_id: offer.id,
            product_id: p.productId,
            min_quantity: p.minQuantity,
          }))
        );
        if (pErr) throw pErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["offers"] }),
  });
}

export function useUpdateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data: payload,
    }: {
      id: number;
      data: {
        name: string;
        description?: string;
        type: string;
        value: number;
        minTotalQuantity?: number;
        isActive: boolean;
        expiresAt?: string;
        products: { productId: number; minQuantity: number }[];
      };
    }) => {
      const { error } = await supabase
        .from("offers")
        .update({
          name: payload.name,
          description: payload.description || null,
          type: payload.type,
          value: payload.value,
          min_total_quantity: payload.minTotalQuantity || null,
          is_active: payload.isActive,
          expires_at: payload.expiresAt || null,
        })
        .eq("id", id);
      if (error) throw error;

      await supabase.from("offer_products").delete().eq("offer_id", id);
      if (payload.products.length > 0) {
        await supabase.from("offer_products").insert(
          payload.products.map((p) => ({
            offer_id: id,
            product_id: p.productId,
            min_quantity: p.minQuantity,
          }))
        );
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["offers"] }),
  });
}

export function useDeleteOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["offers"] }),
  });
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*, purchases(total_amount, paid_amount)")
        .order("name");
      if (error) throw error;
      return (data || []).map(mapSupplier);
    },
  });
}

export function useSupplier(id: number) {
  return useQuery({
    queryKey: ["suppliers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select(
          `*, purchases(
            *,
            purchase_items(*, products(name)),
            supplier_payments(*, payment_methods(name))
          )`
        )
        .eq("id", id)
        .single();
      if (error) throw error;

      const purchases = (data.purchases || []).map((p: any) => {
        const total = parseFloat(p.total_amount);
        const paid = parseFloat(p.paid_amount);
        return {
          id: p.id,
          invoiceNumber: p.invoice_number,
          purchaseDate: p.purchase_date,
          totalAmount: total,
          paidAmount: paid,
          balance: Math.max(0, total - paid),
          status: p.status,
          notes: p.notes,
          createdAt: p.created_at,
          items: (p.purchase_items || []).map((i: any) => ({
            id: i.id,
            productId: i.product_id,
            productName: i.products?.name ?? "",
            quantity: i.quantity,
            purchasePrice: parseFloat(i.purchase_price),
            salePrice: parseFloat(i.sale_price),
            expiresAt: i.expires_at,
          })),
          payments: (p.supplier_payments || []).map((pay: any) => ({
            id: pay.id,
            amount: parseFloat(pay.amount),
            paymentMethodName: pay.payment_methods?.name,
            notes: pay.notes,
            paidAt: pay.paid_at,
          })),
        };
      });

      const allPayments = purchases.flatMap((p: any) => p.payments);
      const totalPurchases = purchases.reduce(
        (s: number, p: any) => s + p.totalAmount,
        0
      );
      const totalDebt = purchases.reduce(
        (s: number, p: any) => s + p.balance,
        0
      );

      return {
        id: data.id,
        name: data.name,
        contactName: data.contact_name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        taxId: data.tax_id,
        notes: data.notes,
        isActive: data.is_active,
        totalPurchases,
        totalDebt,
        purchases,
        payments: allPayments,
      };
    },
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Supplier> & { name: string }) => {
      const { error } = await supabase.from("suppliers").insert({
        name: data.name,
        contact_name: data.contactName || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        tax_id: data.taxId || null,
        notes: data.notes || null,
        is_active: data.isActive ?? true,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Supplier>;
    }) => {
      const { error } = await supabase
        .from("suppliers")
        .update({
          name: data.name,
          contact_name: data.contactName ?? null,
          phone: data.phone ?? null,
          email: data.email ?? null,
          address: data.address ?? null,
          tax_id: data.taxId ?? null,
          notes: data.notes ?? null,
          is_active: data.isActive,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useAddSupplierPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id: purchaseId,
      data,
    }: {
      id: number;
      data: {
        amount: number;
        paymentMethodId?: number;
        notes?: string;
      };
    }) => {
      const { data: purchase, error: pErr } = await supabase
        .from("purchases")
        .select("supplier_id, total_amount, paid_amount")
        .eq("id", purchaseId)
        .single();
      if (pErr) throw pErr;

      const { error } = await supabase.from("supplier_payments").insert({
        purchase_id: purchaseId,
        supplier_id: purchase.supplier_id,
        amount: data.amount,
        payment_method_id: data.paymentMethodId ?? null,
        notes: data.notes ?? null,
      });
      if (error) throw error;

      const newPaid =
        parseFloat(purchase.paid_amount) + data.amount;
      const newStatus =
        newPaid >= parseFloat(purchase.total_amount) ? "paid" : "partial";

      await supabase
        .from("purchases")
        .update({ paid_amount: newPaid, status: newStatus })
        .eq("id", purchaseId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["purchases"] });
    },
  });
}

// ─── Purchases ────────────────────────────────────────────────────────────────

export function usePurchases(params?: { status?: string; supplierId?: number }) {
  return useQuery({
    queryKey: ["purchases", params],
    queryFn: async () => {
      let q = supabase
        .from("purchases")
        .select(
          "*, suppliers(name), purchase_items(*, products(name)), supplier_payments(*, payment_methods(name))"
        )
        .order("created_at", { ascending: false });

      if (params?.status && params.status !== "all") {
        q = q.eq("status", params.status);
      }
      if (params?.supplierId) {
        q = q.eq("supplier_id", params.supplierId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(mapPurchase);
    },
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      supplierId: number;
      invoiceNumber?: string;
      purchaseDate: string;
      notes?: string;
      initialPaymentAmount?: number;
      paymentMethodId?: number;
      items: {
        productId: number;
        quantity: number;
        purchasePrice: number;
        salePrice: number;
        expiresAt?: string;
      }[];
    }) => {
      const totalAmount = data.items.reduce(
        (s, i) => s + i.purchasePrice * i.quantity,
        0
      );

      const { data: purchase, error } = await supabase
        .from("purchases")
        .insert({
          supplier_id: data.supplierId,
          invoice_number: data.invoiceNumber || null,
          purchase_date: data.purchaseDate,
          total_amount: totalAmount,
          paid_amount: 0,
          status: "pending",
          notes: data.notes || null,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: itemsErr } = await supabase.from("purchase_items").insert(
        data.items.map((i) => ({
          purchase_id: purchase.id,
          product_id: i.productId,
          quantity: i.quantity,
          purchase_price: i.purchasePrice,
          sale_price: i.salePrice,
          expires_at: i.expiresAt || null,
        }))
      );
      if (itemsErr) throw itemsErr;

      for (const item of data.items) {
        const { data: prod } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.productId)
          .single();
        if (prod) {
          await supabase
            .from("products")
            .update({
              stock: prod.stock + item.quantity,
              price: item.salePrice,
              expires_at: item.expiresAt || null,
            })
            .eq("id", item.productId);
        }
      }

      if (data.initialPaymentAmount && data.initialPaymentAmount > 0) {
        await supabase.from("supplier_payments").insert({
          purchase_id: purchase.id,
          supplier_id: data.supplierId,
          amount: data.initialPaymentAmount,
          payment_method_id: data.paymentMethodId ?? null,
        });

        const newStatus =
          data.initialPaymentAmount >= totalAmount ? "paid" : "partial";
        await supabase
          .from("purchases")
          .update({
            paid_amount: data.initialPaymentAmount,
            status: newStatus,
          })
          .eq("id", purchase.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

// ─── Payment Methods ──────────────────────────────────────────────────────────

export function usePaymentMethods() {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []).map(mapPaymentMethod);
    },
  });
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; type: string; isActive: boolean }) => {
      const { error } = await supabase.from("payment_methods").insert({
        name: data.name,
        type: data.type,
        is_active: data.isActive,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-methods"] }),
  });
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { name: string; type: string; isActive: boolean };
    }) => {
      const { error } = await supabase
        .from("payment_methods")
        .update({ name: data.name, type: data.type, is_active: data.isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-methods"] }),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-methods"] }),
  });
}

// ─── POS Sale ─────────────────────────────────────────────────────────────────

export function useCreatePOSSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      userId: number;
      customerName?: string;
      notes?: string;
      discountCode?: string;
      items: {
        productId: number;
        productName: string;
        unitPrice: number;
        quantity: number;
        stock: number;
      }[];
    }) => {
      const subtotal = data.items.reduce(
        (s, i) => s + i.unitPrice * i.quantity,
        0
      );

      let discountAmount = 0;
      let appliedCode: string | undefined;

      if (data.discountCode) {
        const { data: disc } = await supabase
          .from("discounts")
          .select("*")
          .eq("code", data.discountCode.toUpperCase())
          .eq("is_active", true)
          .single();
        if (disc) {
          if (disc.type === "percentage") {
            discountAmount = subtotal * (parseFloat(disc.value) / 100);
          } else {
            discountAmount = Math.min(parseFloat(disc.value), subtotal);
          }
          appliedCode = disc.code;
          await supabase
            .from("discounts")
            .update({ used_count: disc.used_count + 1 })
            .eq("id", disc.id);
        }
      }

      const total = Math.max(0, subtotal - discountAmount);

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: data.userId,
          status: "delivered",
          total,
          subtotal,
          discount_amount: discountAmount || null,
          discount_code: appliedCode || null,
          customer_name: data.customerName || null,
          notes: data.notes || null,
          is_pos: true,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("order_items").insert(
        data.items.map((i) => ({
          order_id: order.id,
          product_id: i.productId,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          subtotal: i.unitPrice * i.quantity,
        }))
      );

      for (const item of data.items) {
        const { data: prod } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.productId)
          .single();
        if (prod) {
          await supabase
            .from("products")
            .update({ stock: prod.stock - item.quantity })
            .eq("id", item.productId);
        }
      }

      return {
        id: order.id,
        total,
        subtotal,
        discountAmount,
        discountCode: appliedCode,
        items: data.items,
        customerName: data.customerName,
        createdAt: order.created_at,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}
