import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, ShoppingCart, Users, FolderTree, LogOut, Tag, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/pos", label: "Punto de Venta", icon: Monitor },
  { href: "/admin/orders", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/categories", label: "Categorías", icon: FolderTree },
  { href: "/admin/discounts", label: "Descuentos", icon: Tag },
  { href: "/admin/users", label: "Usuarios", icon: Users },
];

export function AdminSidebar() {
  const [location, setLocation] = useLocation();
  const { mutate: logout } = useLogout();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        queryClient.setQueryData([`/api/auth/me`], null);
        setLocation("/login");
      },
    });
  };

  return (
    <div className="w-64 bg-card border-r border-border h-[calc(100vh-4rem)] flex flex-col fixed left-0 top-16 z-40">
      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        <div className="mb-4 px-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Panel Admin</h2>
        </div>
        {navItems.map((item) => {
          const isActive = item.exact ? location === item.href : (location === item.href || location.startsWith(item.href + "/") || location.startsWith(item.href + "?"));
          return (
            <Link key={item.href} href={item.href}>
              <span className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}>
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
