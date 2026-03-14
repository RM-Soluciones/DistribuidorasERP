import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Navbar } from "./Navbar";
import { useAuth } from "@/lib/auth-context";

export function SellerLayout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!profile || profile.role !== "seller")) {
      setLocation("/login");
    }
  }, [loading, profile, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || profile.role !== "seller") return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="p-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
