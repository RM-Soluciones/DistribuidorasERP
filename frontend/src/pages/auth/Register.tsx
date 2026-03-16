import { useState } from "react";
import { Link, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", phone: "", address: ""
  });
  const [isPending, setIsPending] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    try {
      await signUp(formData);
      toast({ title: "Account Created", description: "Welcome to DistriPro!" });
      setLocation("/customer/dashboard");
    } catch (err: any) {
      toast({
        title: "Registration Failed",
        description: err.message || "An error occurred during registration.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <MainLayout>
      <div className="flex-1 flex items-center justify-center py-16 px-4 bg-slate-50">
        <div className="w-full max-w-xl">
          <div className="bg-card border border-border rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-display font-bold">Apply for Account</h1>
              <p className="text-muted-foreground mt-2">Create a wholesale account for your business.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Company / Contact Name *</Label>
                  <Input 
                    id="name" required className="h-12"
                    value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Usuario / Email *</Label>
                  <Input 
                    id="email" type="text" required className="h-12"
                    placeholder="usuario (o usuario@empresa.com)"
                    value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" className="h-12"
                    value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input 
                    id="password" type="password" required className="h-12"
                    value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Input 
                    id="address" className="h-12"
                    value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base mt-4" disabled={isPending}>
                {isPending ? "Creating Account..." : "Create Account"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
