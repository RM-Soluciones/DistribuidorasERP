import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProducts, useCategories } from "@/lib/supabase-hooks";
import { ProductCard } from "@/components/ui/ProductCard";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Products() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input for smoother filtering
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);
  
  const { data: categories } = useCategories();
  const { data: productsData, isLoading } = useProducts({
    search: debouncedSearch || undefined,
    categoryId: selectedCategory,
    limit: 50
  });

  return (
    <MainLayout>
      <div className="bg-slate-900 text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-display font-bold mb-4">Product Catalog</h1>
          <p className="text-slate-300 max-w-2xl">Browse our extensive collection of wholesale products.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
            <h3 className="font-bold text-lg mb-4">Filters</h3>
            
            <div className="mb-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search products..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wider">Categories</h4>
              <div className="space-y-1">
                <Button 
                  variant={selectedCategory === undefined ? "secondary" : "ghost"} 
                  className="w-full justify-start font-normal"
                  onClick={() => setSelectedCategory(undefined)}
                >
                  All Categories
                </Button>
                {categories?.map(cat => (
                  <Button 
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "secondary" : "ghost"} 
                    className="w-full justify-start font-normal"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : productsData?.products.length === 0 ? (
            <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your search or category filters.</p>
              <Button variant="outline" onClick={() => { setSearch(""); setDebouncedSearch(""); setSelectedCategory(undefined); }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {productsData?.products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
