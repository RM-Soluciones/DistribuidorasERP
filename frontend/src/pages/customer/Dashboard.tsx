import { MainLayout } from "@/components/layout/MainLayout";
import { useOrders } from "@/lib/supabase-hooks";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2, Package, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function CustomerDashboard() {
  const [, setLocation] = useLocation();
  const { profile: user, loading: userLoading } = useAuth();
  const { data: ordersData, isLoading: ordersLoading } = useOrders({ limit: 100 });

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/login");
    }
  }, [user, userLoading, setLocation]);

  if (userLoading || ordersLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <MainLayout>
      <div className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-display font-bold">My Account</h1>
          <p className="text-slate-300 mt-2">Welcome back, {user.name}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-2xl font-bold mb-4">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold mb-1">{user.name}</h2>
              <p className="text-muted-foreground text-sm mb-6">{user.email}</p>
              
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Phone</span>
                  <span className="font-medium">{user.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Address</span>
                  <span className="font-medium">{user.address || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Account Type</span>
                  <Badge variant="secondary" className="uppercase tracking-wider">{user.role}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Package className="h-5 w-5" /> Order History
              </h2>

              {!ordersData?.orders || ordersData.orders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>You haven't placed any orders yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ordersData.orders.map((order) => (
                    <div key={order.id} className="border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-lg">Order #{order.id}</span>
                            <Badge className={`${getStatusColor(order.status)} uppercase text-xs tracking-wider border`}>
                              {order.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-primary">
                          ${order.total.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 rounded-lg p-4 text-sm">
                        <div className="font-medium mb-2">Items ({order.items.length})</div>
                        <ul className="space-y-2">
                          {order.items.map(item => (
                            <li key={item.id} className="flex justify-between">
                              <span className="text-muted-foreground">{item.quantity}x {item.productName}</span>
                              <span className="font-medium">${item.subtotal.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
