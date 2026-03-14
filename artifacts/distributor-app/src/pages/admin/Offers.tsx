import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetOffers, useCreateOffer, useUpdateOffer, useDeleteOffer, useGetProducts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Gift, X, PackagePlus, Percent, DollarSign, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const TYPE_LABELS: Record<string, string> = {
  percentage: "Porcentaje (%)",
  fixed_amount: "Monto fijo ($)",
  bundle_price: "Precio de combo",
};

const emptyForm = {
  name: "", description: "", type: "percentage" as any, value: "",
  minTotalQuantity: "", isActive: true, expiresAt: "",
  products: [] as { productId: number; productName: string; minQuantity: number }[],
};

export default function AdminOffers() {
  const { data: offers, isLoading, refetch } = useGetOffers();
  const { mutateAsync: createOffer, isPending: isCreating } = useCreateOffer();
  const { mutateAsync: updateOffer, isPending: isUpdating } = useUpdateOffer();
  const { mutateAsync: deleteOffer } = useDeleteOffer();
  const { data: productsData } = useGetProducts({ limit: 200 });
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [error, setError] = useState("");

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setError(""); setOpen(true); };
  const openEdit = (o: any) => {
    setEditingId(o.id);
    setForm({
      name: o.name, description: o.description || "", type: o.type, value: o.value.toString(),
      minTotalQuantity: o.minTotalQuantity?.toString() || "",
      isActive: o.isActive,
      expiresAt: o.expiresAt ? o.expiresAt.slice(0, 10) : "",
      products: o.products.map((p: any) => ({ productId: p.productId, productName: p.productName, minQuantity: p.minQuantity })),
    });
    setError(""); setOpen(true);
  };

  const addProduct = () => {
    if (!selectedProductId) return;
    const product = productsData?.products.find(p => p.id === parseInt(selectedProductId));
    if (!product) return;
    if (form.products.find(p => p.productId === product.id)) { toast({ title: "Ya agregado", variant: "destructive" }); return; }
    setForm(f => ({ ...f, products: [...f.products, { productId: product.id, productName: product.name, minQuantity: 1 }] }));
    setSelectedProductId("");
  };

  const removeProduct = (pid: number) => setForm(f => ({ ...f, products: f.products.filter(p => p.productId !== pid) }));
  const updateProductQty = (pid: number, qty: number) => setForm(f => ({ ...f, products: f.products.map(p => p.productId === pid ? { ...p, minQuantity: Math.max(1, qty) } : p) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.value || form.products.length === 0) {
      setError("Nombre, valor y al menos un producto son obligatorios."); return;
    }
    const payload = {
      name: form.name, description: form.description || undefined,
      type: form.type, value: parseFloat(form.value),
      minTotalQuantity: form.minTotalQuantity ? parseInt(form.minTotalQuantity) : undefined,
      isActive: form.isActive,
      expiresAt: form.expiresAt || undefined,
      products: form.products.map(p => ({ productId: p.productId, minQuantity: p.minQuantity })),
    };
    try {
      if (editingId) { await updateOffer({ id: editingId, data: payload }); toast({ title: "Oferta actualizada" }); }
      else { await createOffer({ data: payload }); toast({ title: "Oferta creada" }); }
      setOpen(false); refetch();
    } catch (err: any) {
      setError(err?.message || "Error al guardar");
    }
  };

  const handleDelete = async (id: number) => {
    await deleteOffer({ id });
    toast({ title: "Oferta eliminada" });
    refetch();
  };

  const products = productsData?.products || [];

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2"><Gift className="h-8 w-8 text-primary"/>Ofertas por Productos</h1>
          <p className="text-muted-foreground mt-1">Crea combos y descuentos basados en combinaciones de productos.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4"/>Nueva Oferta</Button>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Productos incluidos</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : !(offers as any[])?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No hay ofertas creadas</TableCell></TableRow>
            ) : (offers as any[])?.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell>
                  <div className="font-semibold">{o.name}</div>
                  {o.description && <div className="text-xs text-muted-foreground">{o.description}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs gap-1">
                    {o.type === "percentage" ? <Percent className="h-3 w-3"/> : o.type === "bundle_price" ? <Tag className="h-3 w-3"/> : <DollarSign className="h-3 w-3"/>}
                    {TYPE_LABELS[o.type]}
                  </Badge>
                </TableCell>
                <TableCell className="font-bold text-primary">
                  {o.type === "percentage" ? `${o.value}%` : `$${parseFloat(o.value).toFixed(2)}`}
                  {o.minTotalQuantity && <div className="text-xs text-muted-foreground font-normal">mín. {o.minTotalQuantity} uds.</div>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {o.products.map((p: any) => (
                      <Badge key={p.productId} variant="secondary" className="text-[10px]">{p.productName} ×{p.minQuantity}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {o.expiresAt ? format(new Date(o.expiresAt), "d MMM yyyy") : "Sin límite"}
                </TableCell>
                <TableCell>
                  <Badge variant={o.isActive ? "default" : "secondary"} className="text-xs">{o.isActive ? "Activa" : "Inactiva"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Edit className="h-4 w-4"/></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar oferta?</AlertDialogTitle>
                        <AlertDialogDescription>Se eliminará la oferta <strong>{o.name}</strong> permanentemente.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(o.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary"/>{editingId ? "Editar Oferta" : "Nueva Oferta"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label>Nombre de la oferta *</Label>
                <Input placeholder="Combo 2x1 Agua, Promo Merienda..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Descripción</Label>
                <Textarea placeholder="Descripción visible al cliente..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-1">
                <Label>Tipo de descuento *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje (%) sobre subtotal del combo</SelectItem>
                    <SelectItem value="fixed_amount">Monto fijo ($) de descuento</SelectItem>
                    <SelectItem value="bundle_price">Precio especial del combo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Valor * {form.type === "percentage" ? "(0–100%)" : "($)"}</Label>
                <Input type="number" step="0.01" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder={form.type === "percentage" ? "10" : "5.00"} />
              </div>
              <div className="space-y-1">
                <Label>Cantidad mínima total (opcional)</Label>
                <Input type="number" min="1" placeholder="Ej: 4 (a partir de 4 unidades)" value={form.minTotalQuantity} onChange={e => setForm(f => ({ ...f, minTotalQuantity: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Fecha de vencimiento</Label>
                <Input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>

              {/* Products */}
              <div className="col-span-2 space-y-2">
                <Label>Productos del combo *</Label>
                <div className="flex gap-2">
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar producto..."/></SelectTrigger>
                    <SelectContent>
                      {products.filter(p => !form.products.find(fp => fp.productId === p.id)).map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name} (Stock: {p.stock})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={addProduct} disabled={!selectedProductId}>
                    <PackagePlus className="h-4 w-4"/>
                  </Button>
                </div>
                {form.products.length > 0 && (
                  <div className="space-y-2 bg-muted/40 rounded-lg p-3">
                    {form.products.map(p => (
                      <div key={p.productId} className="flex items-center gap-3">
                        <span className="flex-1 text-sm font-medium">{p.productName}</span>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs text-muted-foreground">mín:</Label>
                          <Input type="number" min="1" className="w-16 h-7 text-xs" value={p.minQuantity} onChange={e => updateProductQty(p.productId, parseInt(e.target.value) || 1)} />
                          <Label className="text-xs text-muted-foreground">uds.</Label>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeProduct(p.productId)}><X className="h-3 w-3"/></Button>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground mt-1">El descuento se aplica cuando el cliente lleva todos estos productos con las cantidades mínimas indicadas.</p>
                  </div>
                )}
              </div>

              <div className="col-span-2 flex items-center gap-3">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                <Label>Oferta activa</Label>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isCreating || isUpdating}>{isCreating || isUpdating ? "Guardando..." : "Guardar Oferta"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
