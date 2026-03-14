import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useUsers, useCreateAdminUser, useDeleteAdminUser } from "@/lib/supabase-hooks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { UserPlus, Trash2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminUsers() {
  const { data: usersData, isLoading, refetch } = useUsers({ limit: 100 });
  const { mutateAsync: createAdmin, isPending: isCreating } = useCreateAdminUser();
  const { mutateAsync: deleteUser } = useDeleteAdminUser();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", address: "" });
  const [formError, setFormError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.email || !form.password) {
      setFormError("Nombre, email y contraseña son obligatorios.");
      return;
    }
    try {
      await createAdmin({ data: { name: form.name, email: form.email, password: form.password, phone: form.phone || undefined, address: form.address || undefined } });
      toast({ title: "Administrador creado", description: `${form.name} ya puede acceder al panel.` });
      setForm({ name: "", email: "", password: "", phone: "", address: "" });
      setOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err?.message || "No se pudo crear el usuario.");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    try {
      await deleteUser({ id });
      toast({ title: "Usuario eliminado", description: `${name} fue eliminado.` });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo eliminar.", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Usuarios</h1>
          <p className="text-muted-foreground mt-1">Clientes registrados y administradores del sistema.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Crear Administrador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Nuevo Usuario Administrador
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input id="name" placeholder="Ej. Juan García" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="admin@empresa.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Contraseña *</Label>
                <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input id="phone" placeholder="+1-555-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address">Dirección (opcional)</Label>
                <Input id="address" placeholder="Av. Principal 123" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isCreating}>{isCreating ? "Creando..." : "Crear Administrador"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : usersData?.users.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No hay usuarios</TableCell></TableRow>
            ) : usersData?.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"} className="uppercase text-[10px] tracking-wider gap-1">
                    {user.role === "admin" && <ShieldCheck className="h-3 w-3" />}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  <div>{user.phone || "—"}</div>
                  <div className="text-muted-foreground truncate max-w-[200px]">{user.address || "—"}</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(user.createdAt), "d MMM yyyy")}
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará a <strong>{user.name}</strong> de forma permanente. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(user.id, user.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
