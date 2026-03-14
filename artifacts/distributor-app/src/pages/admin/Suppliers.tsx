import { useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from "@/lib/supabase-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Truck, Phone, Mail, Eye, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const emptyForm = { name: "", contactName: "", phone: "", email: "", address: "", taxId: "", notes: "", isActive: true };

export default function AdminSuppliers() {
  const { data: suppliers, isLoading, refetch } = useSuppliers();
  const { mutateAsync: createSupplier, isPending: isCreating } = useCreateSupplier();
  const { mutateAsync: updateSupplier, isPending: isUpdating } = useUpdateSupplier();
  const { mutateAsync: deleteSupplier } = useDeleteSupplier();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setError(""); setOpen(true); };
  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({ name: s.name, contactName: s.contactName || "", phone: s.phone || "", email: s.email || "", address: s.address || "", taxId: s.taxId || "", notes: s.notes || "", isActive: s.isActive });
    setError(""); setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name) { setError("El nombre es obligatorio."); return; }
    try {
      if (editingId) { await updateSupplier({ id: editingId, data: form }); toast({ title: "Proveedor actualizado" }); }
      else { await createSupplier({ data: form }); toast({ title: "Proveedor creado" }); }
      setOpen(false); refetch();
    } catch (err: any) { setError(err?.message || "Error al guardar"); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSupplier({ id });
      toast({ title: "Proveedor eliminado" });
      refetch();
    } catch { toast({ title: "No se puede eliminar (tiene compras asociadas)", variant: "destructive" }); }
  };

  const supplierList = (suppliers as any[]) || [];
  const totalDebt = supplierList.reduce((s: number, sup: any) => s + (sup.totalDebt || 0), 0);

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2"><Truck className="h-8 w-8 text-primary"/>Proveedores</h1>
          <p className="text-muted-foreground mt-1">Gestiona tus proveedores y su historial de compras.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4"/>Nuevo Proveedor</Button>
      </div>

      {totalDebt > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0"/>
          <span>Deuda total con proveedores: <strong>${totalDebt.toFixed(2)}</strong></span>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proveedor</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Deuda pendiente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : !supplierList.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No hay proveedores registrados</TableCell></TableRow>
            ) : supplierList.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-semibold">{s.name}</div>
                  {s.taxId && <div className="text-xs text-muted-foreground">RUT/CUIT: {s.taxId}</div>}
                </TableCell>
                <TableCell className="text-sm">{s.contactName || "—"}</TableCell>
                <TableCell>
                  {s.phone ? <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-sm text-primary hover:underline"><Phone className="h-3 w-3"/>{s.phone}</a> : "—"}
                </TableCell>
                <TableCell>
                  {s.email ? <a href={`mailto:${s.email}`} className="flex items-center gap-1 text-sm text-primary hover:underline"><Mail className="h-3 w-3"/>{s.email}</a> : "—"}
                </TableCell>
                <TableCell>
                  {s.totalDebt > 0 ? (
                    <span className="font-bold text-red-600">${s.totalDebt.toFixed(2)}</span>
                  ) : (
                    <span className="text-green-600 font-medium">Al día</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={s.isActive ? "default" : "secondary"} className="text-xs">{s.isActive ? "Activo" : "Inactivo"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/suppliers/${s.id}`}>
                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4"/></Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="h-4 w-4"/></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
                        <AlertDialogDescription>Se eliminará <strong>{s.name}</strong> permanentemente.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
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
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary"/>{editingId ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label>Nombre de la empresa *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Persona de contacto</Label>
                <Input placeholder="Nombre del contacto" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>RUT / CUIT / NIT</Label>
                <Input placeholder="Identificación fiscal" value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Dirección</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Notas</Label>
                <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                <Label>Proveedor activo</Label>
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
