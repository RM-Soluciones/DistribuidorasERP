import { Link, useLocation } from "wouter";
import { ShoppingCart, LogOut, Package, LayoutDashboard, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/hooks/use-cart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const [, setLocation] = useLocation();
  const { profile: user, loading: isLoading, signOut } = useAuth();
  const cartCount = useCart((state) => state.getCartCount());

  const handleLogout = async () => {
    await signOut();
    setLocation("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-xl group-hover:scale-105 transition-transform shadow-lg shadow-primary/25">
              D
            </div>
            <span className="font-display font-bold text-xl tracking-tight hidden sm:block">
              DistriPro
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/products" className="hover:text-primary transition-colors">Catalog</Link>
            <Link href="/categories" className="hover:text-primary transition-colors">Categories</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/customer/cart">
            <Button variant="ghost" size="icon" className="relative hover:bg-primary/5">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>

          {!isLoading && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 pl-2 pr-3 hover:bg-primary/5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium hidden sm:block">{user.name}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer flex items-center gap-2 w-full">
                        <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/customer/dashboard" className="cursor-pointer flex items-center gap-2 w-full">
                      <Package className="h-4 w-4" /> My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer flex items-center gap-2">
                    <LogOut className="h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" className="hidden sm:flex">Log in</Button>
                </Link>
                <Link href="/register">
                  <Button className="shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all">Sign up</Button>
                </Link>
              </div>
            )
          )}
        </div>
      </div>
    </header>
  );
}
