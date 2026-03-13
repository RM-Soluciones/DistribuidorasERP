import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetProducts, useDeleteProduct, useCreateProduct, useUpdateProduct, useGetCategories, Product } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminProducts() {
  const [search, setSearch] = useState("");
  const { data: productsData, isLoading } = useGetProducts({ search, limit: 100 });
  const { data: categories } = useGetCategories();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    name: "", description: "", price: "0", stock: "0", sku: "", imageUrl: "", categoryId: "", isActive: true
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
        isActive: product.isActive
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: "", description: "", price: "0", stock: "0", sku: "", imageUrl: "", categoryId: "", isActive: true });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10),
      sku: formData.sku,
      imageUrl: formData.imageUrl,
      categoryId: formData.categoryId ? parseInt(formData.categoryId, 10) : undefined,
      isActive: formData.isActive
    };

    if (editingProduct) {
      updateProduct({ id: editingProduct.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/products`] });
          toast({ title: "Product Updated" });
          setIsDialogOpen(false);
        }
      });
    } else {
      createProduct({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/products`] });
          toast({ title: "Product Created" });
          setIsDialogOpen(false);
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProduct({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/products`] });
          toast({ title: "Product Deleted" });
        }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your catalog inventory.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="shadow-md">
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-slate-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10">Loading...</TableCell></TableRow>
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
                <TableCell>{product.categoryName || '-'}</TableCell>
                <TableCell>${product.price.toFixed(2)}</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(product)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Product Name *</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Price ($) *</Label>
                <Input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Stock Quantity *</Label>
                <Input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.categoryId} onValueChange={v => setFormData({...formData, categoryId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Image URL</Label>
                <Input placeholder="https://..." value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Description</Label>
                <Textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="flex items-center gap-2 col-span-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  checked={formData.isActive} 
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="rounded border-border text-primary"
                />
                <Label htmlFor="isActive">Product is active and visible in catalog</Label>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-border">
              <Button type="button" variant="outline" className="mr-2" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? "Saving..." : "Save Product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
