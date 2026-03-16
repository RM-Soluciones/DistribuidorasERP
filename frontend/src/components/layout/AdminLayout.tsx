import { Navbar } from "./Navbar";
import { AdminSidebar } from "./AdminSidebar";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const ADMIN_ALLOWED_ROLES = ["admin", "seller"] as const;
type AdminAllowedRole = (typeof ADMIN_ALLOWED_ROLES)[number];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { profile, loading } = useAuth();

  const getModuleForPath = (path: string) => {
    if (path === "/admin" || path === "/admin/") return "dashboard";
    if (path.startsWith("/admin/pos")) return "pos";
    if (path.startsWith("/admin/orders")) return "orders";
    if (path.startsWith("/admin/products")) return "products";
    if (path.startsWith("/admin/categories")) return "categories";
    if (path.startsWith("/admin/discounts")) return "discounts";
    if (path.startsWith("/admin/offers")) return "offers";
    if (path.startsWith("/admin/suppliers")) return "suppliers";
    if (path.startsWith("/admin/purchases")) return "purchases";
    if (path.startsWith("/admin/payment-methods")) return "payment_methods";
    if (path.startsWith("/admin/users")) return "users";
    if (path.startsWith("/admin/clients")) return "clients";
    return undefined;
  };

  const getFirstAllowedPath = (modules: Record<string, any> | undefined) => {
    const preferred = [
      ["pos", "/admin/pos"],
      ["orders", "/admin/orders"],
      ["products", "/admin/products"],
      ["categories", "/admin/categories"],
      ["discounts", "/admin/discounts"],
      ["offers", "/admin/offers"],
      ["suppliers", "/admin/suppliers"],
      ["purchases", "/admin/purchases"],
      ["payment_methods", "/admin/payment-methods"],
      ["users", "/admin/users"],
      ["clients", "/admin/clients"],
    ];

    if (!modules) return "/admin/pos";

    const found = preferred.find(([key]) => (modules as any)[key] !== false);
    return found ? found[1] : "/admin/pos";
  };

  useEffect(() => {
    if (!loading && (!profile || !ADMIN_ALLOWED_ROLES.includes(profile.role as AdminAllowedRole))) {
      setLocation("/login");
      return;
    }

    if (!loading && profile?.role === "seller") {
      const moduleForCurrentPath = getModuleForPath(String(location || ""));
      const hasAccessToCurrentPath = !moduleForCurrentPath || (profile.modules as any)?.[moduleForCurrentPath] !== false;
      if (!hasAccessToCurrentPath) {
        setLocation(getFirstAllowedPath(profile.modules));
      }
    }
  }, [profile, loading, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || !ADMIN_ALLOWED_ROLES.includes(profile.role as AdminAllowedRole)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 ml-64 min-h-[calc(100vh-4rem)] bg-slate-50/50 p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
