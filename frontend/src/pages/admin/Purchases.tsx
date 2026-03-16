import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { usePurchases, useCreatePurchase, useSuppliers, useProducts, usePaymentMethods, useAddSupplierPayment } from "@/lib/supabase-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Eye, PackagePlus, X, ShoppingBag, TrendingUp, CreditCard, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STATUS_LABELS: Record<string, string> = { pending: "Pendiente", partial: "Pago parcial", paid: "Pagado" };
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-red-100 text-red-800 border-red-200",
  partial: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-green-100 text-green-800 border-green-200",
};

type PurchaseItemRow = { productId: number; productName: string; quantity: number; purchasePrice: number; salePrice: number; expiresAt: string; };

export default function AdminPurchases() {
  const { data: purchases, isLoading, refetch } = usePurchases({});
  const { data: suppliers } = useSuppliers();
  const { data: productsData } = useProducts({ limit: 200 });
  const { data: paymentMethods } = usePaymentMethods({ for: "purchase", onlyActive: true });
  const { mutateAsync: createPurchase, isPending: isCreating } = useCreatePurchase();
  const { mutateAsync: addPayment, isPending: isPaymentPending } = useAddSupplierPayment();
  const { toast } = useToast();

  const [openNew, setOpenNew] = useState(false);
  const [openPayment, setOpenPayment] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItemRow[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [initialPaymentAmount, setInitialPaymentAmount] = useState("");
  const [initialPaymentMethodId, setInitialPaymentMethodId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSupplier, setFilterSupplier] = useState("all");

  const products = productsData?.products || [];
  const supplierList = (suppliers as any[]) || [];
  const methodList = (paymentMethods as any[]) || [];

  const addItem = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === parseInt(selectedProductId));
    if (!product) return;
    if (items.find(i => i.productId === product.id)) { toast({ title: "Ya agregado", variant: "destructive" }); return; }
    setItems(prev => [...prev, {
      productId: product.id, productName: product.name,
      quantity: 1, purchasePrice: product.price, salePrice: product.price, expiresAt: "",
    }]);
    setSelectedProductId("");
  };

  const removeItem = (pid: number) => setItems(prev => prev.filter(i => i.productId !== pid));
  const updateItem = (pid: number, field: keyof PurchaseItemRow, value: any) =>
    setItems(prev => prev.map(i => i.productId === pid ? { ...i, [field]: value } : i));

  const totalAmount = items.reduce((s, i) => s + i.purchasePrice * i.quantity, 0);
  const totalSaleValue = items.reduce((s, i) => s + i.salePrice * i.quantity, 0);
  const margin = totalAmount > 0 ? ((totalSaleValue - totalAmount) / totalSaleValue * 100) : 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || items.length === 0) { toast({ title: "Proveedor y productos son requeridos", variant: "destructive" }); return; }
    try {
      await createPurchase({
        supplierId: parseInt(selectedSupplier),
        invoiceNumber: invoiceNumber || undefined,
        purchaseDate,
        notes: notes || undefined,
        initialPaymentAmount: initialPaymentAmount ? parseFloat(initialPaymentAmount) : undefined,
        paymentMethodId: initialPaymentMethodId ? parseInt(initialPaymentMethodId) : undefined,
        items: items.map(i => ({
          productId: i.productId, quantity: i.quantity,
          purchasePrice: i.purchasePrice, salePrice: i.salePrice,
          expiresAt: i.expiresAt || undefined,
        })),
      });
      toast({ title: "Compra registrada", description: "El stock fue actualizado automáticamente." });
      setOpenNew(false); refetch();
      setSelectedSupplier(""); setInvoiceNumber(""); setNotes(""); setItems([]);
      setInitialPaymentAmount(""); setInitialPaymentMethodId("");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message, variant: "destructive" });
    }
  };

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

  const purchaseList = ((purchases as any[]) || []).filter(p => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterSupplier !== "all" && p.supplierId !== parseInt(filterSupplier)) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2"><ShoppingBag className="h-8 w-8 text-primary"/>Compras</h1>
          <p className="text-muted-foreground mt-1">Registra compras a proveedores y controla pagos pendientes.</p>
        </div>
        <Button onClick={() => setOpenNew(true)} className="gap-2"><Plus className="h-4 w-4"/>Nueva Compra</Button>
      </div>

      {/* Summary cards */}
      {purchaseList.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Total comprado</p>
            <p className="text-2xl font-bold">${purchaseList.reduce((s: number, p: any) => s + p.totalAmount, 0).toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Total pagado</p>
            <p className="text-2xl font-bold text-green-600">${purchaseList.reduce((s: number, p: any) => s + p.paidAmount, 0).toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">Saldo pendiente</p>
            <p className="text-2xl font-bold text-red-600">${purchaseList.reduce((s: number, p: any) => s + p.balance, 0).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Estado"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Proveedor"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proveedores</SelectItem>
            {supplierList.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Compra</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Pagado</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : !purchaseList.length ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No hay compras registradas</TableCell></TableRow>
            ) : purchaseList.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell className="font-semibold">
                  #{p.id}
                  {p.invoiceNumber && <div className="text-xs text-muted-foreground">{p.invoiceNumber}</div>}
                </TableCell>
                <TableCell className="font-medium">{p.supplierName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(p.purchaseDate), "d MMM yyyy")}</TableCell>
                <TableCell className="text-sm">{p.items.length} {p.items.length === 1 ? "producto" : "productos"}</TableCell>
                <TableCell className="font-bold">${p.totalAmount.toFixed(2)}</TableCell>
                <TableCell className="text-green-600 font-medium">${p.paidAmount.toFixed(2)}</TableCell>
                <TableCell className={p.balance > 0 ? "text-red-600 font-bold" : "text-green-600 font-medium"}>
                  ${p.balance.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge className={`${STATUS_COLORS[p.status]} text-[10px] border shadow-none`}>{STATUS_LABELS[p.status]}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/purchases/${p.id}`}>
                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4"/></Button>
                  </Link>
                  {p.balance > 0 && (
                    <Button variant="ghost" size="icon" className="text-green-600" title="Registrar pago" onClick={() => setOpenPayment(p)}>
                      <CreditCard className="h-4 w-4"/>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* New Purchase Dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary"/>Nueva Compra</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label>Proveedor *</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar proveedor..."/></SelectTrigger>
                  <SelectContent>
                    {supplierList.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Nro. de Factura</Label>
                <Input placeholder="FAC-001" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Fecha de compra</Label>
                <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
              </div>
            </div>

            {/* Products */}
            <div className="space-y-3">
              <Label>Productos *</Label>
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Agregar producto..."/></SelectTrigger>
                  <SelectContent>
                    {products.filter(p => !items.find(i => i.productId === p.id)).map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addItem} disabled={!selectedProductId}><PackagePlus className="h-4 w-4"/></Button>
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1.2fr,auto] gap-2 text-xs font-semibold text-muted-foreground px-1">
                    <span>Producto</span><span>Cant.</span><span>Precio compra</span><span>Precio venta</span><span>Vencimiento</span><span/>
                  </div>
                  {items.map(item => {
                    const margin = item.salePrice > 0 ? ((item.salePrice - item.purchasePrice) / item.salePrice * 100).toFixed(1) : "0";
                    return (
                      <div key={item.productId} className="grid grid-cols-[2fr,1fr,1fr,1fr,1.2fr,auto] gap-2 items-center bg-muted/40 rounded-lg p-2">
                        <div>
                          <div className="text-sm font-medium">{item.productName}</div>
                          <div className={`text-xs ${parseFloat(margin) > 0 ? "text-green-600" : "text-red-600"}`}>
                            <TrendingUp className="h-3 w-3 inline"/>Margen: {margin}%
                          </div>
                        </div>
                        <Input type="number" min="1" className="h-8 text-sm" value={item.quantity} onChange={e => updateItem(item.productId, "quantity", parseInt(e.target.value) || 1)} />
                        <Input type="number" step="0.01" min="0" className="h-8 text-sm" value={item.purchasePrice} onChange={e => updateItem(item.productId, "purchasePrice", parseFloat(e.target.value) || 0)} />
                        <Input type="number" step="0.01" min="0" className="h-8 text-sm" value={item.salePrice} onChange={e => updateItem(item.productId, "salePrice", parseFloat(e.target.value) || 0)} />
                        <Input type="date" className="h-8 text-xs" value={item.expiresAt} onChange={e => updateItem(item.productId, "expiresAt", e.target.value)} />
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.productId)}><X className="h-3 w-3"/></Button>
                      </div>
                    );
                  })}

                  {/* Totals */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total compra:</span><span className="font-bold">${totalAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Valor de venta:</span><span className="font-bold text-green-600">${totalSaleValue.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Margen estimado:</span><span className={`font-bold ${margin > 0 ? "text-green-600" : "text-red-600"}`}>{margin.toFixed(1)}%</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Initial payment */}
            <div className="border border-border rounded-xl p-4 space-y-3">
              <Label className="font-semibold">Pago inicial (opcional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Monto pagado hoy</Label>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" value={initialPaymentAmount} onChange={e => setInitialPaymentAmount(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Medio de pago</Label>
                  <Select value={initialPaymentMethodId} onValueChange={setInitialPaymentMethodId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                    <SelectContent>
                      {methodList.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {initialPaymentAmount && totalAmount > 0 && (
                <p className="text-xs text-muted-foreground">Saldo pendiente: <strong>${Math.max(0, totalAmount - parseFloat(initialPaymentAmount || "0")).toFixed(2)}</strong></p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
              <Button type="submit" disabled={isCreating}>{isCreating ? "Guardando..." : "Registrar Compra"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={!!openPayment} onOpenChange={(v) => !v && setOpenPayment(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary"/>Registrar Pago</DialogTitle>
          </DialogHeader>
          {openPayment && (
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Proveedor:</span><span className="font-medium">{openPayment.supplierName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total compra:</span><span>${openPayment.totalAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ya pagado:</span><span className="text-green-600">${openPayment.paidAmount.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold"><span>Saldo pendiente:</span><span className="text-red-600">${openPayment.balance.toFixed(2)}</span></div>
              </div>
              <div className="space-y-1">
                <Label>Monto a pagar *</Label>
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
                <Button type="submit" disabled={isPaymentPending}>{isPaymentPending ? "Guardando..." : "Registrar Pago"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
