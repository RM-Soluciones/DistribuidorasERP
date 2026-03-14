import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { usePaymentMethods, useCreatePaymentMethod, useUpdatePaymentMethod, useDeletePaymentMethod } from "@/lib/supabase-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, CreditCard, Banknote, Building2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TYPE_LABELS: Record<string, string> = {
  cash: "Efectivo", bank_transfer: "Transferencia", credit_card: "Tarjeta de crédito",
  debit_card: "Tarjeta de débito", check: "Cheque", other: "Otro",
};
const TYPE_ICONS: Record<string, any> = {
  cash: Banknote, bank_transfer: Building2, credit_card: CreditCard,
  debit_card: CreditCard, check: ChevronRight, other: CreditCard,
};

const emptyForm = { name: "", type: "cash" as any, isActive: true };

export default function AdminPaymentMethods() {
  const { data: methods, isLoading, refetch } = usePaymentMethods();
  const { mutateAsync: createMethod, isPending: isCreating } = useCreatePaymentMethod();
  const { mutateAsync: updateMethod, isPending: isUpdating } = useUpdatePaymentMethod();
  const { mutateAsync: deleteMethod } = useDeletePaymentMethod();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setError(""); setOpen(true); };
  const openEdit = (m: any) => {
    setEditingId(m.id);
    setForm({ name: m.name, type: m.type, isActive: m.isActive });
    setError(""); setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name) { setError("El nombre es obligatorio."); return; }
    try {
      if (editingId) { await updateMethod({ id: editingId, data: form }); toast({ title: "Medio de pago actualizado" }); }
      else { await createMethod({ data: form }); toast({ title: "Medio de pago creado" }); }
      setOpen(false); refetch();
    } catch (err: any) { setError(err?.message || "Error al guardar"); }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMethod({ id });
      toast({ title: "Medio de pago eliminado" });
      refetch();
    } catch { toast({ title: "No se puede eliminar (está en uso)", variant: "destructive" }); }
  };

  const methodList = (methods as any[]) || [];

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2"><CreditCard className="h-8 w-8 text-primary"/>Medios de Pago</h1>
          <p className="text-muted-foreground mt-1">Gestiona los métodos de pago disponibles para compras y cobros.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4"/>Nuevo Medio</Button>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : !methodList.length ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No hay medios de pago configurados</TableCell></TableRow>
            ) : methodList.map((m: any) => {
              const Icon = TYPE_ICONS[m.type] || CreditCard;
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-semibold">{m.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1 text-xs"><Icon className="h-3 w-3"/>{TYPE_LABELS[m.type]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.isActive ? "default" : "secondary"} className="text-xs">{m.isActive ? "Activo" : "Inactivo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Edit className="h-4 w-4"/></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar medio de pago?</AlertDialogTitle>
                          <AlertDialogDescription>Se eliminará <strong>{m.name}</strong> permanentemente.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(m.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary"/>{editingId ? "Editar Medio de Pago" : "Nuevo Medio de Pago"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input placeholder="Efectivo, Transferencia BBVA..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              <Label>Activo</Label>
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
