import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useDiscounts, useCreateDiscount, useUpdateDiscount, useDeleteDiscount } from "@/lib/supabase-hooks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Plus, Edit, Trash2, Tag, Percent, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const emptyForm = { code: "", name: "", type: "percentage" as "percentage" | "fixed", value: "", minOrderAmount: "", maxUses: "", isActive: true, expiresAt: "" };

export default function AdminDiscounts() {
  const { data: discounts, isLoading, refetch } = useDiscounts();
  const { mutateAsync: createDiscount, isPending: isCreating } = useCreateDiscount();
  const { mutateAsync: updateDiscount, isPending: isUpdating } = useUpdateDiscount();
  const { mutateAsync: deleteDiscount } = useDeleteDiscount();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setError(""); setOpen(true); };
  const openEdit = (d: any) => {
    setEditingId(d.id);
    setForm({
      code: d.code, name: d.name, type: d.type, value: d.value.toString(),
      minOrderAmount: d.minOrderAmount?.toString() || "",
      maxUses: d.maxUses?.toString() || "",
      isActive: d.isActive,
      expiresAt: d.expiresAt ? d.expiresAt.slice(0, 10) : "",
    });
    setError(""); setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.code || !form.name || !form.value) { setError("Código, nombre y valor son obligatorios."); return; }
    const payload = {
      code: form.code.toUpperCase(), name: form.name, type: form.type,
      value: parseFloat(form.value),
      minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : undefined,
      maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
      isActive: form.isActive,
      expiresAt: form.expiresAt || undefined,
    };
    try {
      if (editingId) {
        await updateDiscount({ id: editingId, data: payload });
        toast({ title: "Descuento actualizado" });
      } else {
        await createDiscount({ data: payload });
        toast({ title: "Descuento creado" });
      }
      setOpen(false); refetch();
    } catch (err: any) {
      setError(err?.message || "Error al guardar");
    }
  };

  const handleDelete = async (id: number) => {
    await deleteDiscount({ id });
    toast({ title: "Descuento eliminado" });
    refetch();
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Ofertas y Descuentos</h1>
          <p className="text-muted-foreground mt-1">Crea códigos de descuento para clientes y ventas POS.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Descuento
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : (discounts as any[])?.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No hay descuentos creados</TableCell></TableRow>
            ) : (discounts as any[])?.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell>
                  <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono font-bold">{d.code}</code>
                </TableCell>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="gap-1 text-xs">
                    {d.type === "percentage" ? <Percent className="h-3 w-3"/> : <DollarSign className="h-3 w-3"/>}
                    {d.type === "percentage" ? "Porcentaje" : "Fijo"}
                  </Badge>
                </TableCell>
                <TableCell className="font-bold text-primary">
                  {d.type === "percentage" ? `${d.value}%` : `$${parseFloat(d.value).toFixed(2)}`}
                  {d.minOrderAmount && <div className="text-xs text-muted-foreground font-normal">mín. ${parseFloat(d.minOrderAmount).toFixed(2)}</div>}
                </TableCell>
                <TableCell className="text-sm">
                  {d.usedCount}{d.maxUses ? `/${d.maxUses}` : ""}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {d.expiresAt ? format(new Date(d.expiresAt), "d MMM yyyy") : "Sin límite"}
                </TableCell>
                <TableCell>
                  <Badge variant={d.isActive ? "default" : "secondary"} className="text-xs">
                    {d.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Edit className="h-4 w-4"/></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar descuento?</AlertDialogTitle>
                        <AlertDialogDescription>Se eliminará el código <strong>{d.code}</strong> permanentemente.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(d.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              {editingId ? "Editar Descuento" : "Nuevo Descuento"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Código *</Label>
                <Input placeholder="VERANO20" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="font-mono" />
              </div>
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                    <SelectItem value="fixed">Monto fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Nombre del descuento *</Label>
                <Input placeholder="Descuento de verano" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Valor * {form.type === "percentage" ? "(%)" : "($)"}</Label>
                <Input type="number" step="0.01" min="0" placeholder={form.type === "percentage" ? "20" : "5.00"} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Monto mínimo de orden ($)</Label>
                <Input type="number" step="0.01" min="0" placeholder="Opcional" value={form.minOrderAmount} onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Máximo de usos</Label>
                <Input type="number" min="1" placeholder="Ilimitado" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Fecha de vencimiento</Label>
                <Input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                <Label>Descuento activo</Label>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isCreating || isUpdating}>{isCreating || isUpdating ? "Guardando..." : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
