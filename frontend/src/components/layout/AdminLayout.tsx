import { Navbar } from "./Navbar";
import { AdminSidebar } from "./AdminSidebar";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const ADMIN_ALLOWED_ROLES = ["admin", "seller"] as const;
type AdminAllowedRole = (typeof ADMIN_ALLOWED_ROLES)[number];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!profile || !ADMIN_ALLOWED_ROLES.includes(profile.role as AdminAllowedRole))) {
      setLocation("/login");
    }
  }, [profile, loading, setLocation]);

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
