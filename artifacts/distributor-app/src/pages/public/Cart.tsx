import { useState } from "react";
import { Link, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ArrowRight, Package, AlertCircle } from "lucide-react";
import { useCreateOrder, useGetMe } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Cart() {
  const { items, updateQuantity, removeItem, getCartTotal, clearCart } = useCart();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { retry: false } });
  const { mutate: createOrder, isPending } = useCreateOrder();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [shippingAddress, setShippingAddress] = useState("");
  const [notes, setNotes] = useState("");

  const total = getCartTotal();

  const handleCheckout = () => {
    if (!user) {
      setLocation("/login");
      return;
    }

    if (!shippingAddress.trim()) {
      toast({ title: "Address Required", description: "Please provide a shipping address.", variant: "destructive" });
      return;
    }

    createOrder(
      {
        data: {
          items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
          shippingAddress,
          notes
        }
      },
      {
        onSuccess: () => {
          clearCart();
          toast({ title: "Order Submitted", description: "Your order has been successfully placed." });
          setLocation("/customer/dashboard");
        },
        onError: (err) => {
          toast({ title: "Order Failed", description: err.message || "An error occurred.", variant: "destructive" });
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
          <h1 className="text-3xl font-display font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8 text-lg">Looks like you haven't added any products to your order yet.</p>
          <Link href="/products">
            <Button size="lg" className="h-14 px-8">Start Shopping</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bg-slate-50 py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-display font-bold">Checkout</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border bg-slate-50/50">
                <h2 className="text-xl font-bold">Order Items ({items.length})</h2>
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
                      <div className="flex items-center">
                        <Input 
                          type="number" 
                          min={1} 
                          max={item.product.stock}
                          value={item.quantity} 
                          onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                          className="w-20 text-center"
                        />
                      </div>
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
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span>Calculated later</span>
                </div>
                <div className="h-px bg-border my-2"></div>
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>

              {!userLoading && !user && (
                <Alert className="mb-6 bg-amber-50 text-amber-900 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle>Authentication required</AlertTitle>
                  <AlertDescription>
                    You must be logged in to submit a purchase order.
                    <Link href="/login" className="font-bold underline ml-1">Log in here</Link>.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Shipping Address *</label>
                  <Textarea 
                    placeholder="Enter full delivery address..." 
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Order Notes (Optional)</label>
                  <Textarea 
                    placeholder="Delivery instructions, PO number..." 
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
                {isPending ? "Submitting..." : "Submit Order"} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-4">
                By submitting, you agree to our wholesale terms of service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
