import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetProducts, useDeleteProduct, useCreateProduct, useUpdateProduct, useGetCategories, Product } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays, isAfter } from "date-fns";

function ExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  const now = new Date();
  const days = differenceInDays(date, now);
  if (!isAfter(date, now)) return <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] gap-1 border"><AlertTriangle className="h-3 w-3"/>Vencido</Badge>;
  if (days <= 30) return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] gap-1 border"><CalendarClock className="h-3 w-3"/>Vence en {days}d</Badge>;
  return <Badge variant="outline" className="text-[10px] gap-1"><CalendarClock className="h-3 w-3"/>{format(date, "d MMM yyyy")}</Badge>;
}

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const { data: productsData, isLoading } = useGetProducts({ search, limit: 100 });
  const { data: categories } = useGetCategories();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: "", description: "", price: "0", stock: "0", sku: "", imageUrl: "", categoryId: "", isActive: true, expiresAt: ""
  });

  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();
  const { mutate: deleteProduct } = useDeleteProduct();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price.toString(),
        stock: product.stock.toString(),
        sku: product.sku || "",
        imageUrl: product.imageUrl || "",
        categoryId: product.categoryId?.toString() || "",
        isActive: product.isActive,
        expiresAt: (product as any).expiresAt ? (product as any).expiresAt.slice(0, 10) : "",
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: "", description: "", price: "0", stock: "0", sku: "", imageUrl: "", categoryId: "", isActive: true, expiresAt: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10),
      sku: formData.sku,
      imageUrl: formData.imageUrl,
      categoryId: formData.categoryId ? parseInt(formData.categoryId, 10) : undefined,
      isActive: formData.isActive,
      expiresAt: formData.expiresAt || null,
    };

    if (editingProduct) {
      updateProduct({ id: editingProduct.id, data: payload }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/products`] }); toast({ title: "Producto actualizado" }); setIsDialogOpen(false); }
      });
    } else {
      createProduct({ data: payload }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/products`] }); toast({ title: "Producto creado" }); setIsDialogOpen(false); }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Eliminar este producto?")) {
      deleteProduct({ id }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: [`/api/products`] }); toast({ title: "Producto eliminado" }); }
      });
    }
  };

  // Warn about expiring products
  const expiringProducts = productsData?.products.filter(p => {
    const exp = (p as any).expiresAt;
    if (!exp) return false;
    const days = differenceInDays(new Date(exp), new Date());
    return days <= 30;
  }) || [];

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Productos</h1>
          <p className="text-muted-foreground mt-1">Gestiona el catálogo e inventario.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="shadow-md gap-2">
          <Plus className="h-4 w-4" /> Agregar Producto
        </Button>
      </div>

      {expiringProducts.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <span><strong>{expiringProducts.length}</strong> producto(s) con vencimiento próximo o vencido: {expiringProducts.map(p => p.name).join(", ")}</span>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-slate-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar productos..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : productsData?.products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center overflow-hidden border">
                      {product.imageUrl ? <img src={product.imageUrl} alt="" className="w-full h-full object-cover"/> : <Package className="h-5 w-5 text-muted-foreground"/>}
                    </div>
                    <div>
                      {product.name}
                      <div className="text-xs text-muted-foreground font-normal">SKU: {product.sku || 'N/A'}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{product.categoryName || '—'}</TableCell>
                <TableCell className="font-bold">${product.price.toFixed(2)}</TableCell>
                <TableCell>
                  <span className={product.stock <= 10 ? "text-amber-600 font-semibold" : ""}>{product.stock}</span>
                </TableCell>
                <TableCell><ExpiryBadge expiresAt={(product as any).expiresAt} /></TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {product.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(product)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(product.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Nombre *</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Precio ($) *</Label>
                <Input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Stock *</Label>
                <Input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={formData.categoryId} onValueChange={v => setFormData({...formData, categoryId: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-muted-foreground"/>Fecha de vencimiento</Label>
                <Input type="date" value={formData.expiresAt} onChange={e => setFormData({...formData, expiresAt: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>URL de imagen</Label>
                <Input placeholder="https://..." value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Descripción</Label>
                <Textarea rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked}) } className="rounded border-border text-primary" />
                <Label htmlFor="isActive">Producto activo y visible en catálogo</Label>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-border gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isCreating || isUpdating}>{isCreating || isUpdating ? "Guardando..." : "Guardar Producto"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
