import { useState } from "react";
import { Link, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ArrowRight, Package, AlertCircle, Tag, CheckCircle } from "lucide-react";
import { useCreateOrder, useValidateDiscount } from "@/lib/supabase-hooks";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Cart() {
  const { items, updateQuantity, removeItem, getCartTotal, clearCart } = useCart();
  const { profile: user, loading: userLoading } = useAuth();
  const { mutate: createOrder, isPending } = useCreateOrder();
  const { mutateAsync: validateDiscount, isPending: isValidating } = useValidateDiscount();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number; message: string } | null>(null);

  const subtotal = getCartTotal();
  const discountAmount = appliedDiscount?.amount || 0;
  const total = Math.max(0, subtotal - discountAmount);

  const handleValidateDiscount = async () => {
    if (!discountCode.trim()) return;
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
      toast({ title: "Error al validar el código", variant: "destructive" });
    }
  };

  const handleCheckout = () => {
    if (!user) { setLocation("/login"); return; }
    if (!shippingAddress.trim()) {
      toast({ title: "Dirección requerida", description: "Por favor ingresa una dirección de envío.", variant: "destructive" });
      return;
    }
    createOrder(
      {
        data: {
          items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
          shippingAddress,
          notes,
          discountCode: appliedDiscount?.code,
        }
      },
      {
        onSuccess: () => {
          clearCart();
          toast({ title: "Pedido enviado", description: "Tu pedido fue registrado correctamente." });
          setLocation("/customer/dashboard");
        },
        onError: (err) => {
          toast({ title: "Error al procesar pedido", description: err.message || "Ocurrió un error.", variant: "destructive" });
        }
      }
    );
  };

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-24 max-w-2xl text-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-4">Tu carrito está vacío</h1>
          <p className="text-muted-foreground mb-8 text-lg">Todavía no has agregado productos a tu pedido.</p>
          <Link href="/products">
            <Button size="lg" className="h-14 px-8">Ver Catálogo</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bg-slate-50 py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-display font-bold">Carrito de Compras</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border bg-slate-50/50">
                <h2 className="text-xl font-bold">Artículos del pedido ({items.length})</h2>
              </div>
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <div key={item.product.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="w-20 h-20 bg-secondary rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-border">
                      {item.product.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Link href={`/products/${item.product.id}`} className="font-semibold text-lg hover:text-primary transition-colors">
                        {item.product.name}
                      </Link>
                      <div className="text-sm text-muted-foreground mt-1">SKU: {item.product.sku || 'N/A'}</div>
                      <div className="text-primary font-bold mt-2">${item.product.price.toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <Input
                        type="number"
                        min={1}
                        max={item.product.stock}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                        className="w-20 text-center"
                      />
                      <div className="w-24 text-right font-bold hidden sm:block">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeItem(item.product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary & Form */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-6">Resumen del pedido</h2>

              {/* Discount Code */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">Código de descuento</label>
                {appliedDiscount ? (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 font-medium">{appliedDiscount.code} — {appliedDiscount.message}</span>
                    <button onClick={() => { setAppliedDiscount(null); setDiscountCode(""); }} className="text-green-500 hover:text-green-700 text-xs underline">Quitar</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="CODIGO"
                        className="pl-9 font-mono uppercase"
                        value={discountCode}
                        onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === "Enter" && handleValidateDiscount()}
                      />
                    </div>
                    <Button variant="outline" onClick={handleValidateDiscount} disabled={isValidating || !discountCode.trim()}>
                      {isValidating ? "..." : "Aplicar"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5"/>Descuento ({appliedDiscount?.code})</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>Envío</span>
                  <span>Calculado luego</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>

              {!userLoading && !user && (
                <Alert className="mb-6 bg-amber-50 text-amber-900 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle>Requiere autenticación</AlertTitle>
                  <AlertDescription>
                    Debes iniciar sesión para confirmar tu pedido.
                    <Link href="/login" className="font-bold underline ml-1">Iniciar sesión</Link>.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Dirección de envío *</label>
                  <Textarea
                    placeholder="Ingresa la dirección de entrega completa..."
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Notas del pedido (opcional)</label>
                  <Textarea
                    placeholder="Instrucciones de entrega, número de orden..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                </div>
              </div>

              <Button
                className="w-full h-14 text-lg shadow-xl shadow-primary/20"
                onClick={handleCheckout}
                disabled={isPending || (!userLoading && !user)}
              >
                {isPending ? "Enviando..." : "Confirmar Pedido"} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-4">
                Al confirmar, aceptas los términos y condiciones del servicio mayorista.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
