import { Link } from "wouter";
import { ShoppingCart, Eye, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Product } from "@workspace/api-client-react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCart(state => state.addItem);
  const { toast } = useToast();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your order.`,
    });
  };

  return (
    <Link href={`/products/${product.id}`}>
      <div className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col h-full cursor-pointer">
        <div className="aspect-square bg-secondary relative overflow-hidden flex-shrink-0">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <Package size={48} />
            </div>
          )}
          
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
            <Button size="icon" variant="secondary" className="rounded-full" onClick={(e) => { e.preventDefault(); }}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="icon" className="rounded-full shadow-lg" onClick={handleAddToCart}>
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
          
          {!product.isActive && (
             <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-md">
               Out of Stock
             </div>
          )}
        </div>
        
        <div className="p-5 flex flex-col flex-1">
          <div className="text-xs text-muted-foreground mb-1">{product.categoryName || 'Uncategorized'}</div>
          <h3 className="font-semibold text-foreground leading-tight mb-2 line-clamp-2">{product.name}</h3>
          
          <div className="mt-auto flex items-center justify-between">
            <span className="font-display font-bold text-lg text-primary">${product.price.toFixed(2)}</span>
            <span className="text-xs text-muted-foreground font-medium bg-secondary px-2 py-1 rounded-md">
              SKU: {product.sku || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
