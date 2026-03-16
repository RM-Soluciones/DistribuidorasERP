import { useState, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useProducts, useCategories, useValidateDiscount, useCreatePOSSale, usePaymentMethods } from "@/lib/supabase-hooks";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, Tag, Monitor, Package, Printer } from "lucide-react";
import { format } from "date-fns";

type CartItem = { productId: number; productName: string; unitPrice: number; quantity: number; stock: number; };

export default function AdminPOS() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [payments, setPayments] = useState<{ paymentMethodId: number; methodName: string; amount: number }[]>([]);
  const { toast } = useToast();

  const { profile } = useAuth();
  const { data: productsData } = useProducts({ search, categoryId, limit: 50 });
  const { data: categories } = useCategories();
  const { data: paymentMethods } = usePaymentMethods({ for: "pos", onlyActive: true });
  const { mutateAsync: validateDiscount } = useValidateDiscount();
  const { mutateAsync: createPOSSale } = useCreatePOSSale();

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discountAmount = appliedDiscount?.amount || 0;
  const total = Math.max(0, subtotal - discountAmount);
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - paidTotal);

  const addToCart = (product: any) => {
    if (product.stock === 0) { toast({ title: "Sin stock", variant: "destructive" }); return; }
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { toast({ title: "Stock máximo", description: `Solo hay ${product.stock} unidades disponibles`, variant: "destructive" }); return prev; }
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1, stock: product.stock }];
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.productId !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return null as any;
      if (newQty > i.stock) { toast({ title: `Máximo: ${i.stock}`, variant: "destructive" }); return i; }
      return { ...i, quantity: newQty };
    }).filter(Boolean));
  };

  const removeItem = (productId: number) => setCart(prev => prev.filter(i => i.productId !== productId));

  const handleValidateDiscount = async () => {
    if (!discountCode) return;
    try {
      const result = await validateDiscount({ data: { code: discountCode, orderAmount: subtotal } });
      if ((result as any).valid) {
        setAppliedDiscount({ code: discountCode.toUpperCase(), amount: (result as any).discountAmount, message: (result as any).message });
        toast({ title: "Descuento aplicado", description: (result as any).message });
      } else {
        setAppliedDiscount(null);
        toast({ title: "Código inválido", description: (result as any).message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error al validar", variant: "destructive" });
    }
  };

  const handleAddPayment = () => {
    setPaymentError("");

    const amount = parseFloat(paymentAmount || "0");
    const method = (paymentMethods || []).find((m) => m.id === selectedPaymentMethodId);

    if (!method) {
      setPaymentError("Selecciona un método de pago.");
      return;
    }

    if (isNaN(amount) || amount < 0) {
      setPaymentError("Ingresa un monto válido.");
      return;
    }

    if (amount > remaining) {
      setPaymentError("El monto no puede exceder el total restante.");
      return;
    }

    setPayments((prev) => [
      ...prev,
      { paymentMethodId: method.id, methodName: method.name, amount },
    ]);
    setSelectedPaymentMethodId(null);
    setPaymentAmount("");
  };

  const removePayment = (index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcessSale = async () => {
    if (cart.length === 0) { toast({ title: "Carrito vacío", variant: "destructive" }); return; }
    if (!profile) { toast({ title: "No autenticado", variant: "destructive" }); return; }
    setIsProcessing(true);
    try {
      const sale = await createPOSSale({
        userId: profile.id,
        customerName: customerName || undefined,
        notes: notes || undefined,
        discountCode: appliedDiscount?.code || undefined,
        items: cart,
        payments: payments.map((p) => ({ paymentMethodId: p.paymentMethodId, amount: p.amount })),
      });
      setLastSale(sale);
      setCart([]);
      setCustomerName("");
      setNotes("");
      setDiscountCode("");
      setAppliedDiscount(null);
      setPayments([]);
      setSelectedPaymentMethodId(null);
      setPaymentAmount("");
      toast({ title: "Venta procesada", description: `Venta #${sale.id} registrada correctamente` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo procesar la venta", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (lastSale) {
    return (
      <AdminLayout>
        <div className="max-w-lg mx-auto mt-8 printable">
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-1">¡Venta Completada!</h2>
            <p className="text-muted-foreground mb-6">Venta #{lastSale.id} registrada</p>

            <div className="bg-muted/40 rounded-xl p-4 text-left mb-6 space-y-2 text-sm">
              {lastSale.customerName && <div className="flex justify-between"><span className="text-muted-foreground">Cliente:</span><span className="font-medium">{lastSale.customerName}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Fecha:</span><span>{format(new Date(lastSale.createdAt), "d MMM yyyy, HH:mm")}</span></div>
              <Separator />
              {lastSale.items.map((item: any) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.productName} x{item.quantity}</span>
                  <span className="font-medium">${((item.subtotal ?? item.unitPrice * item.quantity) as number).toFixed(2)}</span>
                </div>
              ))}
              <Separator />
              {lastSale.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1"><Tag className="h-3 w-3"/>Descuento ({lastSale.discountCode})</span>
                  <span>-${lastSale.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {lastSale.payments && lastSale.payments.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Pagos</div>
                  {lastSale.payments.map((p: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{p.methodName || `Método ${p.paymentMethodId}`}</span>
                      <span className="font-medium">${p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-1">
                <span>Total</span>
                <span>${lastSale.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3 no-print">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
              <Button className="flex-1" onClick={() => setLastSale(null)}>
                Nueva Venta
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <Monitor className="h-7 w-7 text-primary" />
          Punto de Venta
        </h1>
        <p className="text-muted-foreground mt-1">Procesa ventas en mostrador de forma rápida.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Browser */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar productos..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant={!categoryId ? "default" : "outline"} onClick={() => setCategoryId(undefined)} className="h-7 text-xs">Todos</Button>
            {(categories as any[])?.map((c: any) => (
              <Button key={c.id} size="sm" variant={categoryId === c.id ? "default" : "outline"} onClick={() => setCategoryId(categoryId === c.id ? undefined : c.id)} className="h-7 text-xs">{c.name}</Button>
            ))}
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {productsData?.products.filter(p => p.isActive && p.stock > 0).map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-card border border-border rounded-xl p-3 text-left hover:border-primary/50 hover:shadow-md transition-all active:scale-95 group"
              >
                <div className="w-full h-20 bg-muted rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>
                <div className="text-xs font-semibold leading-tight text-foreground line-clamp-2 mb-1">{product.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">${product.price.toFixed(2)}</span>
                  <span className="text-[10px] text-muted-foreground">Stock: {product.stock}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart / Checkout */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col h-fit sticky top-20">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="font-bold">Carrito ({cart.length})</h2>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
              Selecciona productos
            </div>
          ) : (
            <ScrollArea className="max-h-64 mb-4">
              <div className="space-y-2 pr-2">
                {cart.map(item => (
                  <div key={item.productId} className="flex items-center gap-2 bg-muted/40 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{item.productName}</div>
                      <div className="text-xs text-muted-foreground">${item.unitPrice.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.productId, -1)}><Minus className="h-3 w-3"/></Button>
                      <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.productId, 1)}><Plus className="h-3 w-3"/></Button>
                    </div>
                    <span className="text-xs font-bold w-14 text-right">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(item.productId)}><Trash2 className="h-3 w-3"/></Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {cart.length > 0 && (
            <>
              {/* Customer */}
              <div className="space-y-3 border-t border-border pt-3">
                <div>
                  <Label className="text-xs">Nombre del cliente (opcional)</Label>
                  <Input className="h-8 text-sm mt-1" placeholder="Cliente walk-in" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Notas</Label>
                  <Input className="h-8 text-sm mt-1" placeholder="Notas opcionales" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>

                {/* Discount */}
                <div>
                  <Label className="text-xs">Código de descuento</Label>
                  <div className="flex gap-1.5 mt-1">
                    <Input className="h-8 text-sm font-mono" placeholder="CODIGO" value={discountCode} onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setAppliedDiscount(null); }} />
                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={handleValidateDiscount}>Aplicar</Button>
                  </div>
                  {appliedDiscount && (
                    <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                      <Tag className="h-3 w-3"/>{appliedDiscount.message}
                    </div>
                  )}
                </div>

                {/* Payments */}
                <div>
                  <Label className="text-xs">Métodos de pago</Label>
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex items-center gap-2">
                      <select
                        className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                        value={selectedPaymentMethodId ?? ""}
                        onChange={(e) => setSelectedPaymentMethodId(e.target.value ? parseInt(e.target.value) : null)}
                      >
                        <option value="">Seleccionar método</option>
                        {(paymentMethods || []).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        className="h-8 w-28 text-sm"
                        placeholder="Monto"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                      <Button size="sm" variant="outline" onClick={handleAddPayment}>
                        Agregar
                      </Button>
                    </div>
                    {paymentError && <div className="text-xs text-destructive">{paymentError}</div>}
                    {payments.length > 0 && (
                      <div className="space-y-1">
                        {payments.map((p, idx) => (
                          <div key={`${p.paymentMethodId}-${idx}`} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 p-2 text-sm">
                            <div>
                              <div className="font-medium">{p.methodName}</div>
                              <div className="text-xs text-muted-foreground">${p.amount.toFixed(2)}</div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removePayment(idx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Total pagado: ${paidTotal.toFixed(2)} • Restante: ${remaining.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1 text-sm border-t border-border mt-3 pt-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1"><Tag className="h-3 w-3"/>Descuento</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-1 border-t border-border">
                  <span>Total</span><span>${total.toFixed(2)}</span>
                </div>
              </div>

              <Button className="mt-4 w-full gap-2" size="lg" onClick={handleProcessSale} disabled={isProcessing}>
                <CheckCircle className="h-4 w-4" />
                {isProcessing ? "Procesando..." : `Cobrar $${total.toFixed(2)}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
