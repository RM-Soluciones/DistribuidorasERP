import { useState } from "react";
import { Link, useRoute } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useSupplier, usePaymentMethods, useAddSupplierPayment } from "@/lib/supabase-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Phone, Mail, MapPin, CreditCard, Clock, Package, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STATUS_LABELS: Record<string, string> = { pending: "Pendiente", partial: "Pago parcial", paid: "Pagado" };
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-red-100 text-red-800 border-red-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-green-100 text-green-800 border-green-200",
};

export default function SupplierDetail() {
  const [, params] = useRoute("/admin/suppliers/:id");
  const id = parseInt(params?.id || "0");
  const { data: supplier, isLoading, refetch } = useSupplier(id) as any;
  const { data: paymentMethods } = usePaymentMethods({ for: "purchase", onlyActive: true });
  const { mutateAsync: addPayment, isPending } = useAddSupplierPayment();
  const { toast } = useToast();

  const [openPayment, setOpenPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [expandedPurchase, setExpandedPurchase] = useState<number | null>(null);

  const methodList = (paymentMethods as any[]) || [];

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount) return;
    try {
      await addPayment({
        id: openPayment.id,
        data: {
          amount: parseFloat(paymentAmount),
          paymentMethodId: paymentMethodId ? parseInt(paymentMethodId) : undefined,
          notes: paymentNotes || undefined,
        }
      });
      toast({ title: "Pago registrado" });
      setOpenPayment(null); refetch();
      setPaymentAmount(""); setPaymentMethodId(""); setPaymentNotes("");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

  if (isLoading) return <AdminLayout><div className="p-8 text-center text-muted-foreground">Cargando...</div></AdminLayout>;
  if (!supplier) return <AdminLayout><div className="p-8 text-center text-muted-foreground">Proveedor no encontrado</div></AdminLayout>;

  const purchases = supplier.purchases || [];
  const allPayments = supplier.payments || [];

  return (
    <AdminLayout>
      <div className="mb-6">
        <Link href="/admin/suppliers">
          <Button variant="ghost" size="sm" className="gap-2 mb-4"><ArrowLeft className="h-4 w-4"/>Volver a Proveedores</Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">{supplier.name}</h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
              {supplier.contactName && <span>{supplier.contactName}</span>}
              {supplier.phone && <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 text-primary hover:underline"><Phone className="h-3.5 w-3.5"/>{supplier.phone}</a>}
              {supplier.email && <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 text-primary hover:underline"><Mail className="h-3.5 w-3.5"/>{supplier.email}</a>}
              {supplier.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/>{supplier.address}</span>}
            </div>
          </div>
          <div className="text-right">
            {supplier.totalDebt > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                <p className="text-sm text-red-700">Deuda total</p>
                <p className="text-2xl font-bold text-red-700">${supplier.totalDebt.toFixed(2)}</p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                <p className="text-sm text-green-700">Sin deuda pendiente</p>
                <p className="text-lg font-bold text-green-700">Al día ✓</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Compras</p>
          <p className="text-2xl font-bold">{purchases.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total comprado</p>
          <p className="text-2xl font-bold">${purchases.reduce((s: number, p: any) => s + p.totalAmount, 0).toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total pagado</p>
          <p className="text-2xl font-bold text-green-600">${purchases.reduce((s: number, p: any) => s + p.paidAmount, 0).toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Pagos realizados</p>
          <p className="text-2xl font-bold">{allPayments.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchases */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-bold">Historial de Compras</h2>
          {!purchases.length ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">No hay compras registradas</div>
          ) : purchases.map((p: any) => (
            <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 cursor-pointer hover:bg-muted/30 flex items-center justify-between" onClick={() => setExpandedPurchase(expandedPurchase === p.id ? null : p.id)}>
                <div className="flex items-center gap-3">
                  {expandedPurchase === p.id ? <ChevronDown className="h-4 w-4 text-muted-foreground"/> : <ChevronRight className="h-4 w-4 text-muted-foreground"/>}
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      Compra #{p.id}
                      {p.invoiceNumber && <span className="text-muted-foreground font-normal">— {p.invoiceNumber}</span>}
                      <Badge className={`${STATUS_COLORS[p.status]} text-[9px] border shadow-none`}>{STATUS_LABELS[p.status]}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3"/>{format(new Date(p.purchaseDate), "d MMMM yyyy")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">${p.totalAmount.toFixed(2)}</div>
                  {p.balance > 0 && <div className="text-xs text-red-600">Saldo: ${p.balance.toFixed(2)}</div>}
                </div>
              </div>

              {expandedPurchase === p.id && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Items */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1"><Package className="h-3 w-3"/>Productos</h4>
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr><th className="text-left py-1">Producto</th><th className="text-center py-1">Cant.</th><th className="text-right py-1">P.Compra</th><th className="text-right py-1">P.Venta</th><th className="text-right py-1">Margen</th><th className="text-right py-1">Vence</th></tr>
                      </thead>
                      <tbody>
                        {p.items.map((item: any) => (
                          <tr key={item.id} className="border-t border-border/50">
                            <td className="py-1.5 font-medium">{item.productName}</td>
                            <td className="py-1.5 text-center">{item.quantity}</td>
                            <td className="py-1.5 text-right">${item.purchasePrice.toFixed(2)}</td>
                            <td className="py-1.5 text-right">${item.salePrice.toFixed(2)}</td>
                            <td className={`py-1.5 text-right font-medium ${item.margin > 0 ? "text-green-600" : "text-red-600"}`}>
                              <TrendingUp className="h-3 w-3 inline"/>{item.margin}%
                            </td>
                            <td className="py-1.5 text-right text-xs text-muted-foreground">
                              {item.expiresAt ? format(new Date(item.expiresAt), "d MMM yy") : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Payments */}
                  {p.payments.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1"><CreditCard className="h-3 w-3"/>Pagos</h4>
                      <div className="space-y-1">
                        {p.payments.map((pay: any) => (
                          <div key={pay.id} className="flex items-center justify-between text-sm bg-green-50 rounded-lg px-3 py-1.5">
                            <div>
                              <span className="font-medium">${pay.amount.toFixed(2)}</span>
                              {pay.paymentMethodName && <span className="text-muted-foreground ml-2 text-xs">via {pay.paymentMethodName}</span>}
                              {pay.notes && <span className="text-muted-foreground ml-2 text-xs italic">— {pay.notes}</span>}
                            </div>
                            <span className="text-xs text-muted-foreground">{format(new Date(pay.paidAt), "d MMM yyyy")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {p.balance > 0 && (
                    <Button size="sm" variant="outline" className="gap-2 text-green-700 border-green-300 hover:bg-green-50" onClick={() => setOpenPayment(p)}>
                      <CreditCard className="h-3.5 w-3.5"/>Registrar pago (${p.balance.toFixed(2)} pendiente)
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* All Payments Timeline */}
        <div>
          <h2 className="text-lg font-bold mb-3">Todos los Pagos</h2>
          {!allPayments.length ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground text-sm">Sin pagos registrados</div>
          ) : (
            <div className="space-y-2">
              {allPayments.sort((a: any, b: any) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()).map((pay: any) => (
                <div key={pay.id} className="bg-card border border-border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-green-600">${pay.amount.toFixed(2)}</span>
                      <div className="text-xs text-muted-foreground mt-0.5">Compra #{pay.purchaseId}</div>
                      {pay.paymentMethodName && <div className="text-xs text-muted-foreground">{pay.paymentMethodName}</div>}
                      {pay.notes && <div className="text-xs italic text-muted-foreground mt-0.5">{pay.notes}</div>}
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(pay.paidAt), "d MMM yyyy")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={!!openPayment} onOpenChange={(v) => !v && setOpenPayment(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary"/>Registrar Pago</DialogTitle>
          </DialogHeader>
          {openPayment && (
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between font-bold"><span>Saldo pendiente:</span><span className="text-red-600">${openPayment.balance.toFixed(2)}</span></div>
              </div>
              <div className="space-y-1">
                <Label>Monto *</Label>
                <Input type="number" step="0.01" min="0.01" max={openPayment.balance} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Medio de pago</Label>
                <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                  <SelectContent>
                    {methodList.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Notas</Label>
                <Input placeholder="Referencia, cheque nro..." value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenPayment(null)}>Cancelar</Button>
                <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Registrar Pago"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
