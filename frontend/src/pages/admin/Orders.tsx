import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useOrders, useUpdateOrderStatus, OrderStatus } from "@/lib/supabase-hooks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, Package, Tag, Monitor } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", confirmed: "Confirmado", processing: "Procesando",
  shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-indigo-100 text-indigo-800 border-indigo-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const { data: ordersData, isLoading } = useOrders({
    limit: 100,
    status: statusFilter !== "all" ? (statusFilter as OrderStatus) : undefined,
  });

  const { mutate: updateStatus } = useUpdateOrderStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusChange = (id: number, newStatus: string) => {
    updateStatus(
      { id, data: { status: newStatus as OrderStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          toast({ title: "Estado actualizado", description: `Pedido #${id} → ${STATUS_LABELS[newStatus] || newStatus}` });
        },
      }
    );
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground mt-1">Gestiona y prepara los pedidos de clientes.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-slate-50/50 flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Artículos</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Cambiar Estado</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : ordersData?.orders.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No hay pedidos</TableCell></TableRow>
            ) : ordersData?.orders.map((order) => (
              <TableRow key={order.id} className="hover:bg-muted/30">
                <TableCell className="font-semibold">
                  <div className="flex items-center gap-2">
                    #{order.id}
                    {order.isPOS && <Badge variant="outline" className="text-[9px] gap-1 py-0"><Monitor className="h-2.5 w-2.5"/>POS</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{format(new Date(order.createdAt), "d MMM yyyy, HH:mm")}</TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{order.customerName || order.userName}</div>
                  <div className="text-xs text-muted-foreground">{order.userEmail}</div>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">{order.items.length} {order.items.length === 1 ? "artículo" : "artículos"}</span>
                  <div className="text-xs text-muted-foreground">{order.items.slice(0, 2).map(i => i.productName).join(", ")}{order.items.length > 2 ? "..." : ""}</div>
                </TableCell>
                <TableCell>
                  <div className="font-bold">${order.total.toFixed(2)}</div>
                  {order.discountCode && (
                    <div className="text-xs text-green-600 flex items-center gap-1"><Tag className="h-3 w-3"/>{order.discountCode}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={`${STATUS_COLORS[order.status]} text-[10px] uppercase tracking-wider border shadow-none`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select defaultValue={order.status} onValueChange={(v) => handleStatusChange(order.id, v)}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Pedido #{selectedOrder?.id}
              {selectedOrder?.isPOS && <Badge variant="outline" className="text-[9px] gap-1"><Monitor className="h-2.5 w-2.5"/>POS</Badge>}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{selectedOrder.customerName || selectedOrder.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{selectedOrder.userEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha:</span>
                  <span>{format(new Date(selectedOrder.createdAt), "d MMM yyyy, HH:mm")}</span>
                </div>
                {selectedOrder.shippingAddress && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dirección:</span>
                    <span className="text-right max-w-[260px]">{selectedOrder.shippingAddress}</span>
                  </div>
                )}
                {selectedOrder.notes && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Notas:</span>
                    <span className="text-right max-w-[260px] italic">{selectedOrder.notes}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Artículos del pedido</h3>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Producto</th>
                        <th className="text-center px-3 py-2 font-medium">Cant.</th>
                        <th className="text-right px-3 py-2 font-medium">Precio</th>
                        <th className="text-right px-3 py-2 font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item: any) => (
                        <tr key={item.id} className="border-t border-border">
                          <td className="px-3 py-2.5 font-medium">{item.productName}</td>
                          <td className="px-3 py-2.5 text-center">{item.quantity}</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold">${item.subtotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-1 text-sm border-t border-border pt-3">
                {selectedOrder.subtotal && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1"><Tag className="h-3 w-3"/>Descuento ({selectedOrder.discountCode})</span>
                    <span>-${selectedOrder.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                  <span>Total</span>
                  <span>${selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-1">
                <Badge className={`${STATUS_COLORS[selectedOrder.status]} text-xs border shadow-none px-3 py-1`}>
                  {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
                </Badge>
                <Select defaultValue={selectedOrder.status} onValueChange={(v) => { handleStatusChange(selectedOrder.id, v); setSelectedOrder({ ...selectedOrder, status: v }); }}>
                  <SelectTrigger className="w-[150px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
