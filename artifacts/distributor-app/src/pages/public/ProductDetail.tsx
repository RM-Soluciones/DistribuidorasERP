import { useParams } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { useGetProduct } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, ChevronLeft, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export default function ProductDetail() {
  const { id } = useParams();
  const { data: product, isLoading, error } = useGetProduct(Number(id));
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart(state => state.addItem);
  const { toast } = useToast();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !product) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Product not found</h2>
          <Link href="/products">
            <Button>Back to Catalog</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const handleAddToCart = () => {
    addItem(product, quantity);
    toast({
      title: "Added to cart",
      description: `${quantity}x ${product.name} added to your order.`,
    });
  };

  return (
    <MainLayout>
      <div className="bg-slate-50 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link href="/products" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Catalog
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="bg-white rounded-3xl border border-border overflow-hidden aspect-square flex items-center justify-center p-8 shadow-sm">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <Package className="h-32 w-32 text-muted-foreground/20" />
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <div className="mb-2 text-sm font-bold text-primary tracking-wider uppercase">
              {product.categoryName || 'Uncategorized'}
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              {product.name}
            </h1>
            
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl font-bold text-foreground">${product.price.toFixed(2)}</span>
              <span className="bg-secondary text-secondary-foreground text-sm font-medium px-3 py-1 rounded-full">
                SKU: {product.sku || 'N/A'}
              </span>
            </div>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {product.description || "No description available for this product."}
            </p>

            <div className="bg-slate-50 rounded-2xl p-6 border border-border mb-8">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-700">{product.stock} units in stock</span>
              </div>
              
              <div className="flex items-end gap-4">
                <div className="w-32">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Quantity</label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={product.stock} 
                    value={quantity} 
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-12 text-lg"
                  />
                </div>
                <Button 
                  size="lg" 
                  className="flex-1 h-12 text-base shadow-lg shadow-primary/20"
                  onClick={handleAddToCart}
                  disabled={!product.isActive || product.stock < 1}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add to Order
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>• Free shipping on orders over $500</p>
              <p>• 30-day return policy for unused items</p>
              <p>• B2B bulk pricing automatically applied in cart</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
