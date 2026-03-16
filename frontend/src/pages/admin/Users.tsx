import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useUsers, useCreateAdminUser, useUpdateAdminUser, useDeleteAdminUser, UserModules } from "@/lib/supabase-hooks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Edit, UserPlus, Trash2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

export default function AdminUsers() {
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const { data: usersData, isLoading, refetch } = useUsers({ limit: 100, role: roleFilter });
  const { mutateAsync: createAdmin, isPending: isCreating } = useCreateAdminUser();
  const { mutateAsync: updateUser } = useUpdateAdminUser();
  const { mutateAsync: deleteUser } = useDeleteAdminUser();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [role, setRole] = useState<"admin" | "seller" | "delivery" | "customer">("admin");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    is_active: true,
    modules: {
      dashboard: true,
      categories: true,
      discounts: true,
      offers: true,
      orders: true,
      payment_methods: true,
      pos: true,
      products: true,
      purchases: true,
      suppliers: true,
      clients: true,
      users: true,
      deliveries: true,
    } as UserModules,
  });
  const [formError, setFormError] = useState("");

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      phone: "",
      address: "",
      is_active: true,
      modules: {
        dashboard: true,
        categories: true,
        discounts: true,
        offers: true,
        orders: true,
        payment_methods: true,
        pos: true,
        products: true,
        purchases: true,
        suppliers: true,
        clients: true,
        users: true,
        deliveries: true,
      },
    });
    setRole("admin");
    setEditingUser(null);
    setFormError("");
  };

  const openCreateDialog = () => {
    resetForm();
    setOpen(true);
  };

  const openEditDialog = (user: any) => {
    setEditingUser(user);
    setRole(user.role);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      phone: user.phone || "",
      address: user.address || "",
      is_active: user.is_active ?? true,
      modules: user.modules ?? {
        dashboard: true,
        categories: true,
        discounts: true,
        offers: true,
        orders: true,
        payment_methods: true,
        pos: true,
        products: true,
        purchases: true,
        suppliers: true,
        clients: true,
        users: true,
        deliveries: true,
      },
    });
    setFormError("");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!form.name || !form.email) {
      setFormError("Nombre y email son obligatorios.");
      return;
    }

    try {
      if (editingUser) {
        await updateUser({
          id: editingUser.id,
          name: form.name,
          email: form.email,
          role,
          phone: form.phone || null,
          address: form.address || null,
          modules: form.modules,
          is_active: form.is_active,
        });
        toast({ title: "Usuario actualizado", description: `${form.name} fue actualizado.` });
      } else {
        if (!form.password) {
          setFormError("Contraseña es obligatoria para crear el usuario.");
          return;
        }
        await createAdmin({
          name: form.name,
          email: form.email,
          password: form.password,
          role,
          phone: form.phone || undefined,
          address: form.address || undefined,
          modules: form.modules,
        });
        toast({ title: "Usuario creado", description: `${form.name} ya puede acceder al sistema.` });
      }

      resetForm();
      setOpen(false);
      refetch();
    } catch (err: any) {
      setFormError(err?.message || "No se pudo guardar el usuario.");
    }
  };

  const handleToggleModule = async (user: any, moduleKey: keyof UserModules, value: boolean) => {
    try {
      await updateUser({
        id: user.id,
        modules: { ...(user.modules || {}), [moduleKey]: value },
      });
      toast({ title: "Permisos actualizados" });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo actualizar.", variant: "destructive" });
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
      <div className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Usuarios</h1>
            <p className="text-muted-foreground mt-1">Clientes, vendedores, repartidores y administradores.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: "Todos", value: undefined },
                { label: "Clientes", value: "customer" },
                { label: "Vendedores", value: "seller" },
                { label: "Repartidores", value: "delivery" },
                { label: "Admins", value: "admin" },
              ].map((option) => (
                <Button
                  key={String(option.value)}
                  variant={roleFilter === option.value ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setRoleFilter(option.value as any)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openCreateDialog}>
                <UserPlus className="h-4 w-4" />
                Crear usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  {editingUser ? "Editar usuario" : "Nuevo usuario"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1">
                  <Label htmlFor="name">Nombre completo *</Label>
                  <Input
                    id="name"
                    placeholder="Ej. Juan García"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email">Usuario / Email *</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="usuario (o usuario@empresa.com)"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="role">Rol *</Label>
                  <Select value={role} onValueChange={(value) => setRole(value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Cliente</SelectItem>
                      <SelectItem value="seller">Vendedor</SelectItem>
                      <SelectItem value="delivery">Repartidor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  />
                  <Label>Activo</Label>
                </div>

                <div className="space-y-1">
                  <Label>Permisos / Módulos</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { key: "dashboard", label: "Dashboard" },
                      { key: "categories", label: "Categorías" },
                      { key: "discounts", label: "Descuentos" },
                      { key: "offers", label: "Ofertas" },
                      { key: "orders", label: "Pedidos" },
                      { key: "payment_methods", label: "Medios de pago" },
                      { key: "pos", label: "Punto de venta" },
                      { key: "products", label: "Productos" },
                      { key: "purchases", label: "Compras" },
                      { key: "suppliers", label: "Proveedores" },
                      { key: "clients", label: "Clientes" },
                      { key: "users", label: "Usuarios" },
                      { key: "deliveries", label: "Entregas" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center gap-2">
                        <Switch
                          checked={(form.modules as any)?.[item.key] ?? false}
                          onCheckedChange={(v) =>
                            setForm((f) => ({
                              ...f,
                              modules: { ...f.modules, [item.key]: v },
                            }))
                          }
                        />
                        <span className="text-sm">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phone">Teléfono (opcional)</Label>
                  <Input
                    id="phone"
                    placeholder="+1-555-0000"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="address">Dirección (opcional)</Label>
                  <Input
                    id="address"
                    placeholder="Av. Principal 123"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  />
                </div>

                {formError && <p className="text-sm text-destructive">{formError}</p>}

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? "Creando..." : "Crear usuario"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Módulos</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : usersData?.users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No hay usuarios
                </TableCell>
              </TableRow>
            ) : (
              usersData?.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell className="space-y-1">
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                      className="uppercase text-[10px] tracking-wider gap-1"
                    >
                      {user.role === "admin" && <ShieldCheck className="h-3 w-3" />}
                      {user.role}
                    </Badge>
                    <Badge
                      variant={user.is_active ? "default" : "secondary"}
                      className="uppercase text-[10px] tracking-wider"
                    >
                      {user.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { key: "dashboard", label: "Dashboard" },
                        { key: "categories", label: "Categorías" },
                        { key: "discounts", label: "Descuentos" },
                        { key: "offers", label: "Ofertas" },
                        { key: "orders", label: "Pedidos" },
                        { key: "payment_methods", label: "Medios de pago" },
                        { key: "pos", label: "POS" },
                        { key: "products", label: "Productos" },
                        { key: "purchases", label: "Compras" },
                        { key: "suppliers", label: "Proveedores" },
                        { key: "users", label: "Usuarios" },
                        { key: "deliveries", label: "Entregas" },
                      ]
                        .filter((m) => (user.modules as any)?.[m.key])
                        .map((m) => (
                          <Badge key={m.key} className="text-[10px]">
                            {m.label}
                          </Badge>
                        ))}
                      {(!user.modules || Object.values(user.modules).filter(Boolean).length === 0) && (
                        <span className="text-xs text-muted-foreground">Sin permisos</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{user.phone || "—"}</div>
                    <div className="text-muted-foreground truncate max-w-[200px]">{user.address || "—"}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.createdAt), "d MMM yyyy")}
                  </TableCell>
                  <TableCell className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={() => openEditDialog(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
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
                          <AlertDialogAction
                            onClick={() => handleDelete(user.id, user.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
