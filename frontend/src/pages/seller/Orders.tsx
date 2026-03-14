import { useEffect, useMemo, useState } from "react";
import { SellerLayout } from "@/components/layout/SellerLayout";
import { useOrders, useOrderDeliveries, useAssignOrderDelivery, useUsers, useUpdateOrderStatus, OrderStatus } from "@/lib/supabase-hooks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Package, Truck, Calendar } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  processing: "Procesando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-indigo-100 text-indigo-800 border-indigo-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function SellerOrders() {
  const [statusFilter, setStatusFilter] = useState<string>("processing");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [driverId, setDriverId] = useState<number | null>(null);

  const { data: ordersData, isLoading: ordersLoading } = useOrders({ status: statusFilter as OrderStatus });
  const { data: driversData, isLoading: driversLoading } = useUsers({ role: "delivery" });
  const { data: deliveriesData } = useOrderDeliveries();

  const { mutate: assignDelivery, isLoading: assigning } = useAssignOrderDelivery();
  const { mutate: updateOrderStatus } = useUpdateOrderStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!selectedOrder) return;

    const existing = deliveriesData?.deliveries?.find((d) => d.orderId === selectedOrder.id);
    setDriverId(existing?.assignedTo ?? null);
    setDeliveryDate(existing?.deliveryDate ?? "");
  }, [selectedOrder, deliveriesData]);

  const drivers = driversData?.users ?? [];

  const handleAssign = async () => {
    if (!selectedOrder) return;
    if (!driverId) {
      toast({ title: "Selecciona un repartidor", variant: "destructive" });
      return;
    }
    try {
      await assignDelivery({
        orderId: selectedOrder.id,
        assignedTo: driverId,
        deliveryDate: deliveryDate || null,
        status: "assigned",
      });
      await updateOrderStatus({ id: selectedOrder.id, data: { status: "shipped" } });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-deliveries"] });
      toast({ title: "Entrega asignada", description: "El pedido fue asignado a un repartidor." });
      setSelectedOrder(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo asignar la entrega.", variant: "destructive" });
    }
  };

  const openDialog = (order: any) => {
    setSelectedOrder(order);
  };

  const availableOrders = useMemo(() => ordersData?.orders ?? [], [ordersData]);

  return (
    <SellerLayout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Pedidos</h1>
          <p className="text-muted-foreground mt-1">Asigna repartidores y fechas de entrega.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="processing">Procesando</SelectItem>
              <SelectItem value="shipped">Enviado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Asignado</TableHead>
              <TableHead className="w-[150px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordersLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : availableOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No hay pedidos para mostrar.
                </TableCell>
              </TableRow>
            ) : (
              availableOrders.map((order) => {
                const assigned = deliveriesData?.deliveries?.find((d: any) => d.orderId === order.id);
                return (
                  <TableRow key={order.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold">#{order.id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(order.createdAt), "d MMM yyyy, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{order.customerName || order.userName}</div>
                      <div className="text-xs text-muted-foreground">{order.userEmail}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800 border-gray-200"} text-[10px] uppercase tracking-wider border shadow-none`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {assigned ? (
                        <div className="text-sm">
                          <div>{assigned.driver?.name || "-"}</div>
                          <div className="text-xs text-muted-foreground">{assigned.deliveryDate ? format(new Date(assigned.deliveryDate), "dd MMM yyyy") : "Sin fecha"}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog open={selectedOrder?.id === order.id} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="secondary" className="gap-2" onClick={() => setSelectedOrder(order)}>
                            <Truck className="h-4 w-4" /> Asignar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[520px]">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Calendar className="h-5 w-5 text-primary" />
                              Asignar pedido #{order.id}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-2">
                            <div className="space-y-1">
                              <Label>Repartidor</Label>
                              <Select value={driverId ? String(driverId) : ""} onValueChange={(value) => setDriverId(Number(value) || null)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un repartidor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {driversLoading ? (
                                    <SelectItem value="">Cargando...</SelectItem>
                                  ) : (
                                    drivers.map((d) => (
                                      <SelectItem key={d.id} value={String(d.id)}>
                                        {d.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label>Fecha de entrega</Label>
                              <Input
                                type="date"
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setSelectedOrder(null)}>
                              Cancelar
                            </Button>
                            <Button type="button" onClick={handleAssign} disabled={assigning}>
                              {assigning ? "Asignando..." : "Guardar"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </SellerLayout>
  );
}
