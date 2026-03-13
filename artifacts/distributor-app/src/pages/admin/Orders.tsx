import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetOrders, useUpdateOrderStatus, OrderStatus } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: ordersData, isLoading } = useGetOrders({ 
    limit: 100, 
    status: statusFilter !== "all" ? (statusFilter as OrderStatus) : undefined 
  });
  
  const { mutate: updateStatus } = useUpdateOrderStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusChange = (id: number, newStatus: string) => {
    updateStatus(
      { id, data: { status: newStatus as OrderStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [`/api/orders`] });
          toast({ title: "Status Updated", description: `Order #${id} is now ${newStatus}.` });
        }
      }
    );
  };

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
    <AdminLayout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage and fulfill customer orders.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-slate-50/50 flex gap-4">
          <div className="w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                {Object.values(OrderStatus).map(status => (
                  <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Update Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10">Loading...</TableCell></TableRow>
            ) : ordersData?.orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">#{order.id}</TableCell>
                <TableCell>{format(new Date(order.createdAt), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  {order.userName}
                  <div className="text-xs text-muted-foreground">{order.userEmail}</div>
                </TableCell>
                <TableCell className="font-bold">${order.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge className={`${getStatusColor(order.status)} uppercase text-[10px] tracking-wider border shadow-none`}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select defaultValue={order.status} onValueChange={(v) => handleStatusChange(order.id, v)}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(OrderStatus).map(status => (
                        <SelectItem key={status} value={status} className="text-xs capitalize">{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
