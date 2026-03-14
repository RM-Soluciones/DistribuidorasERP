import { Link } from "wouter";
import { ArrowRight, Truck, ShieldCheck, Box, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProducts, useCategories } from "@/lib/supabase-hooks";
import { ProductCard } from "@/components/ui/ProductCard";

export default function Home() {
  const { data: productsData } = useProducts({ limit: 4 });
  const { data: categories } = useCategories();

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 text-white pb-20 pt-32 lg:pt-48 lg:pb-32">
        <div className="absolute inset-0 z-0 opacity-40">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-logistics.png`} 
            alt="Logistics Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-foreground border border-primary/30 text-sm font-medium mb-6">
              <Zap className="h-4 w-4 text-primary" /> Premium B2B Distribution
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-6">
              Streamline Your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">Supply Chain</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl leading-relaxed">
              Access thousands of premium wholesale products with real-time inventory, exclusive B2B pricing, and next-day delivery nationwide.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/products">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base shadow-xl shadow-primary/20">
                  Browse Catalog <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base bg-white/10 hover:bg-white/20 text-white border-white/20">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Truck, title: "Fast Nationwide Shipping", desc: "Next-day delivery available for orders placed before 2PM EST." },
              { icon: Box, title: "Massive Inventory", desc: "Over 10,000 SKUs in stock and ready to ship from our regional warehouses." },
              { icon: ShieldCheck, title: "Quality Guarantee", desc: "100% authentic products sourced directly from trusted manufacturers." }
            ].map((feature, i) => (
              <div key={i} className="bg-card p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Featured Products</h2>
              <p className="text-muted-foreground text-lg">Top selling items for your business.</p>
            </div>
            <Link href="/products">
              <Button variant="ghost" className="hidden sm:flex group">
                View All <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {productsData?.products?.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          
          <div className="mt-8 text-center sm:hidden">
            <Link href="/products">
              <Button variant="outline" className="w-full">View All Products</Button>
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
