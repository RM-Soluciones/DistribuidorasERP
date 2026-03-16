import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Package, ShoppingCart, Users, FolderTree, LogOut,
  Tag, Monitor, Gift, Truck, ShoppingBag, CreditCard, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const navSections = [
  {
    label: "Ventas",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, requiresModule: "dashboard" },
      { href: "/admin/pos", label: "Punto de Venta", icon: Monitor, requiresModule: "pos" },
      { href: "/admin/orders", label: "Pedidos", icon: ShoppingCart, requiresModule: "orders" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/admin/products", label: "Productos", icon: Package, requiresModule: "products" },
      { href: "/admin/categories", label: "Categorías", icon: FolderTree, requiresModule: "categories" },
      { href: "/admin/discounts", label: "Descuentos", icon: Tag, requiresModule: "discounts" },
      { href: "/admin/offers", label: "Ofertas Combo", icon: Gift, requiresModule: "offers" },
    ],
  },
  {
    label: "Compras",
    items: [
      { href: "/admin/suppliers", label: "Proveedores", icon: Truck, requiresModule: "suppliers" },
      { href: "/admin/purchases", label: "Compras", icon: ShoppingBag, requiresModule: "purchases" },
      { href: "/admin/payment-methods", label: "Medios de Pago", icon: CreditCard, requiresModule: "payment_methods" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/users", label: "Usuarios", icon: Users, requiresModule: "users" },
      { href: "/admin/clients", label: "Clientes", icon: FolderTree, requiresModule: "clients" },
    ],
  },
];

export function AdminSidebar() {
  const [location, setLocation] = useLocation();
  const { profile, signOut } = useAuth();

  const modules = profile?.modules ?? {};
  const isSeller = profile?.role === "seller";

  const handleLogout = async () => {
    await signOut();
    setLocation("/login");
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : (location === href || location.startsWith(href + "/") || location.startsWith(href + "?"));

  return (
    <div className="w-64 bg-card border-r border-border h-[calc(100vh-4rem)] flex flex-col fixed left-0 top-16 z-40">
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
        {navSections
          .map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">{section.label}</p>
              <div className="space-y-0.5">
                {section.items
                  .filter((item) => {
                    if (!isSeller) return true;
                    if (!item.requiresModule) return true;
                    const hasAccess = (modules as any)[item.requiresModule];
                    return hasAccess !== false;
                  })
                  .map((item) => {
                    const active = isActive(item.href, item.exact);
                    return (
                      <Link key={item.href} href={item.href}>
                        <span
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group cursor-pointer",
                            active
                              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-4 w-4 flex-shrink-0",
                              active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          <span className="flex-1">{item.label}</span>
                          {!active && (
                            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                          )}
                        </span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>

      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
