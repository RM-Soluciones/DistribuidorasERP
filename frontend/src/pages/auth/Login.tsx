import { useState } from "react";
import { Link, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const { signIn, profile } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    try {
      const p = await signIn(email, password);
      toast({ title: "Welcome back!", description: "Successfully logged in." });
      if (p?.role === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/customer/dashboard");
      }
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: err.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 flex items-center justify-center py-20 px-4 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-3xl p-8 shadow-xl shadow-slate-200/50">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                D
              </div>
              <h1 className="text-2xl font-display font-bold">Welcome Back</h1>
              <p className="text-muted-foreground mt-2">Sign in to manage your orders and account.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@company.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                />
              </div>

              <Button type="submit" className="w-full h-12 text-base mt-2" disabled={isPending}>
                {isPending ? "Signing in..." : "Sign In"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              Don't have a wholesale account?{" "}
              <Link href="/register" className="font-bold text-primary hover:underline">
                Apply here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
