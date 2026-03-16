import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useOrders, useUpdateOrderStatus, useUpdateOrderItems, useAssignOrderDelivery, useUsers, OrderStatus } from "@/lib/supabase-hooks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, Package, Tag, Monitor, Truck, Plus, Minus, Trash2 } from "lucide-react";

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
  const [assignOrder, setAssignOrder] = useState<any>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [assignDate, setAssignDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [editableItems, setEditableItems] = useState<any[]>([]);
  const [isSavingEdits, setIsSavingEdits] = useState(false);

  const { data: ordersData, isLoading } = useOrders({
    limit: 100,
    status: statusFilter !== "all" ? (statusFilter as OrderStatus) : undefined,
  });
  const { data: driversData } = useUsers({ role: "delivery" });

  const { mutate: updateStatus } = useUpdateOrderStatus();
  const { mutate: updateOrderItems } = useUpdateOrderItems();
  const { mutate: assignDelivery } = useAssignOrderDelivery();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isSelectedOrderEditable = selectedOrder?.status === "pending" || selectedOrder?.status === "confirmed";

  const handleApprove = async (id: number) => {
    updateStatus(
      { id, data: { status: "confirmed" as OrderStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          toast({ title: "Pedido aprobado", description: `Pedido #${id} ahora está confirmado.` });
        },
      }
    );
  };

  const handleCancel = async (id: number) => {
    updateStatus(
      { id, data: { status: "cancelled" as OrderStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          toast({ title: "Pedido cancelado", description: `Pedido #${id} ha sido cancelado y se reponen los productos.` });
        },
      }
    );
  };

  const handleSaveEdits = async () => {
    if (!selectedOrder) return;
    setIsSavingEdits(true);

    try {
      await updateOrderItems({ orderId: selectedOrder.id, items: editableItems });
      toast({ title: "Pedido actualizado", description: "Items del pedido actualizados." });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSelectedOrder(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudieron guardar los cambios.", variant: "destructive" });
    } finally {
      setIsSavingEdits(false);
    }
  };

  const handleAssign = async () => {
    if (!assignOrder) return;
    if (!selectedDriverId) {
      toast({ title: "Selecciona un repartidor", variant: "destructive" });
      return;
    }

    try {
      const assignmentDate = assignDate || new Date().toISOString().slice(0, 10);
      await assignDelivery({
        orderId: assignOrder.id,
        assignedTo: selectedDriverId,
        deliveryDate: assignmentDate,
        status: "assigned",
      });

      await updateStatus({ id: assignOrder.id, data: { status: "processing" as OrderStatus } });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Pedido asignado", description: `Pedido #${assignOrder.id} asignado a repartidor.` });
      setAssignOrder(null);
      setSelectedDriverId(null);
      setAssignDate(new Date().toISOString().slice(0, 10));
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo asignar el pedido.", variant: "destructive" });
    }
  };

  const handleBulkAssign = async () => {
    if (selectedOrderIds.length === 0) {
      toast({ title: "Selecciona pedidos", variant: "destructive" });
      return;
    }
    if (!selectedDriverId) {
      toast({ title: "Selecciona un repartidor", variant: "destructive" });
      return;
    }

    try {
      const assignmentDate = assignDate || new Date().toISOString().slice(0, 10);
      await Promise.all(
        selectedOrderIds.map(async (orderId) => {
          await assignDelivery({
            orderId,
            assignedTo: selectedDriverId,
            deliveryDate: assignmentDate,
            status: "assigned",
          });
          await updateStatus({ id: orderId, data: { status: "processing" as OrderStatus } });
        })
      );
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Pedidos asignados", description: `${selectedOrderIds.length} pedidos asignados al chofer.` });
      setSelectedOrderIds([]);
      setSelectedDriverId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudieron asignar los pedidos.", variant: "destructive" });
    }
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
        <div className="p-4 border-b border-border bg-slate-50/50 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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

            {selectedOrderIds.length > 0 && (
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <span className="text-xs text-muted-foreground">Seleccionados: {selectedOrderIds.length}</span>
                <Select value={selectedDriverId?.toString() ?? ""} onValueChange={(v) => setSelectedDriverId(v ? parseInt(v) : null)}>
                  <SelectTrigger className="w-60">
                    <SelectValue placeholder="Elegir repartidor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(driversData?.users || []).map((driver) => (
                      <SelectItem key={driver.id} value={driver.id.toString()}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} className="h-9" />
                <Button size="sm" onClick={handleBulkAssign}>
                  Asignar seleccionados
                </Button>
              </div>
            )}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={
                    (ordersData?.orders || []).filter((o: any) => o.status === "confirmed").length > 0 &&
                    selectedOrderIds.length ===
                      (ordersData?.orders || []).filter((o: any) => o.status === "confirmed").length
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedOrderIds(
                        (ordersData?.orders || [])
                          .filter((o: any) => o.status === "confirmed")
                          .map((o: any) => o.id)
                      );
                    } else {
                      setSelectedOrderIds([]);
                    }
                  }}
                />
              </TableHead>
              <TableHead>Pedido</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Artículos</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
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
                <TableCell className="w-[40px]">
                  <Checkbox
                    checked={selectedOrderIds.includes(order.id)}
                    onCheckedChange={(checked) => {
                      setSelectedOrderIds((prev) => {
                        if (checked) return [...new Set([...prev, order.id])];
                        return prev.filter((id) => id !== order.id);
                      });
                    }}
                    disabled={order.status !== "confirmed"}
                  />
                </TableCell>
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
                <TableCell className="flex flex-col gap-2">
                  {order.status === "pending" && (
                    <Button size="sm" variant="secondary" onClick={() => handleApprove(order.id)}>
                      Aprobar
                    </Button>
                  )}
                  {order.status === "confirmed" && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setSelectedOrder(order)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setAssignOrder(order)}>
                        Asignar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleCancel(order.id)}>
                        Cancelar
                      </Button>
                    </>
                  )}
                  {order.status === "processing" && (
                    <Button size="sm" variant="outline" onClick={() => setAssignOrder(order)}>
                      Reasignar
                    </Button>
                  )}
                  {order.status === "shipped" && (
                    <span className="text-xs text-muted-foreground">En camino</span>
                  )}
                  {order.status === "delivered" && (
                    <span className="text-xs text-muted-foreground">Entregado</span>
                  )}
                  {order.status === "cancelled" && (
                    <span className="text-xs text-muted-foreground">Cancelado</span>
                  )}
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedOrder(order);
                      setEditableItems(
                        (order.items || []).map((item: any) => ({
                          productId: item.productId,
                          productName: item.productName,
                          quantity: item.quantity,
                          unitPrice: item.unitPrice,
                        }))
                      );
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setAssignOrder(order);
                      setSelectedDriverId(null);
                      setAssignDate(new Date().toISOString().slice(0, 10));
                    }}
                  >
                    <Truck className="h-4 w-4" />
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
                        {isSelectedOrderEditable && <th className="text-right px-3 py-2 font-medium">Acción</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(isSelectedOrderEditable ? editableItems : selectedOrder.items).map((item: any) => (
                        <tr key={item.productId} className="border-t border-border">
                          <td className="px-3 py-2.5 font-medium">{item.productName}</td>
                          <td className="px-3 py-2.5 text-center">
                            {isSelectedOrderEditable ? (
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    setEditableItems((prev) =>
                                      prev.map((i) =>
                                        i.productId === item.productId
                                          ? { ...i, quantity: Math.max(1, i.quantity - 1) }
                                          : i
                                      )
                                    );
                                  }}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    setEditableItems((prev) =>
                                      prev.map((i) =>
                                        i.productId === item.productId
                                          ? { ...i, quantity: i.quantity + 1 }
                                          : i
                                      )
                                    );
                                  }}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              item.quantity
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold">${(item.unitPrice * item.quantity).toFixed(2)}</td>
                          {isSelectedOrderEditable && (
                            <td className="px-3 py-2.5 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  setEditableItems((prev) => prev.filter((i) => i.productId !== item.productId));
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {isSelectedOrderEditable && (
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditableItems(
                          (selectedOrder.items || []).map((item: any) => ({
                            productId: item.productId,
                            productName: item.productName,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                          }))
                        );
                      }}
                    >
                      Restaurar
                    </Button>
                    <Button onClick={handleSaveEdits} disabled={isSavingEdits}>
                      {isSavingEdits ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </div>
                )}
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
              <div className="flex items-center justify-between pt-3">
                <Badge className={`${STATUS_COLORS[selectedOrder.status]} text-xs border shadow-none px-3 py-1`}>
                  {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
                </Badge>
                <div className="flex items-center gap-2">
                  {selectedOrder.status === "pending" && (
                    <Button size="sm" onClick={() => handleApprove(selectedOrder.id)}>
                      Aprobar
                    </Button>
                  )}
                  {selectedOrder.status === "confirmed" && (
                    <Button size="sm" variant="secondary" onClick={() => setAssignOrder(selectedOrder)}>
                      Asignar
                    </Button>
                  )}
                  {selectedOrder.status !== "delivered" && selectedOrder.status !== "cancelled" && (
                    <Button size="sm" variant="destructive" onClick={() => handleCancel(selectedOrder.id)}>
                      Cancelar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => window.open(`/admin/invoice/${selectedOrder.id}`, "_blank") }>
                    Factura
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignOrder} onOpenChange={(open) => !open && setAssignOrder(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Asignar pedido #{assignOrder?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Repartidor *</Label>
              <Select value={selectedDriverId?.toString() ?? ""} onValueChange={(v) => setSelectedDriverId(v ? parseInt(v) : null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un repartidor" />
                </SelectTrigger>
                <SelectContent>
                  {(driversData?.users || []).map((driver) => (
                    <SelectItem key={driver.id} value={driver.id.toString()}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fecha de entrega</Label>
              <Input type="date" value={assignDate} onChange={(e) => setAssignDate(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignOrder(null)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleAssign}>
                Asignar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
