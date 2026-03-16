import { useEffect, useMemo, useState } from "react";
import { DeliveryLayout } from "@/components/layout/DeliveryLayout";
import { useAuth } from "@/lib/auth-context";
import { useAssignOrderDelivery, useCreateOrderPayment, useOrderDeliveries, useOrderPayments, usePaymentMethods, useUpdateOrderStatus } from "@/lib/supabase-hooks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, Check, Eye, Truck, X } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  processing: "Procesando",
  shipped: "En camino",
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

export default function DeliveryDashboard() {
  const { profile } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);

  const { data, isLoading } = useOrderDeliveries({ assignedTo: profile?.id, deliveryDate: date });
  const { mutate: updateOrderStatus } = useUpdateOrderStatus();
  const { mutate: assignDelivery } = useAssignOrderDelivery();
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const [cancelDelivery, setCancelDelivery] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState(false);

  const { data: payments, isLoading: isLoadingPayments } = useOrderPayments(selectedDelivery?.order?.id);
  const { data: paymentMethods } = usePaymentMethods();
  const { mutate: createPayment } = useCreateOrderPayment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentError, setPaymentError] = useState<string>("");

  const deliveries = useMemo(() => data?.deliveries ?? [], [data]);

  const handleUpdateStatus = async (orderId: number, status: string, successMessage: string) => {
    try {
      await updateOrderStatus({ id: orderId, data: { status: status as any } });
      queryClient.invalidateQueries({ queryKey: ["order-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: successMessage });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo actualizar.", variant: "destructive" });
    }
  };

  const handleCancelDelivery = async () => {
    if (!cancelDelivery) return;
    setIsCancelling(true);

    try {
      await updateOrderStatus({ id: cancelDelivery.order?.id, data: { status: "cancelled" } });
      await assignDelivery({
        orderId: cancelDelivery.order?.id,
        assignedTo: cancelDelivery.assignedTo,
        status: "cancelled",
        notes: cancelReason || "Pedido cancelado",
      });

      queryClient.invalidateQueries({ queryKey: ["order-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });

      toast({ title: "Pedido cancelado", description: "El pedido ha sido cancelado con motivo registrado." });
      setCancelDelivery(null);
      setCancelReason("");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo cancelar el pedido.", variant: "destructive" });
    } finally {
      setIsCancelling(false);
    }
  };

  const paymentTotal = useMemo(() => {
    return (payments || []).reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const handleAddPayment = async () => {
    setPaymentError("");
    const orderId = selectedDelivery?.order?.id;
    const amount = parseFloat(paymentAmount);

    if (!orderId) {
      setPaymentError("No hay pedido seleccionado.");
      return;
    }
    if (!selectedPaymentMethodId) {
      setPaymentError("Selecciona un medio de pago.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setPaymentError("Ingresa un monto válido.");
      return;
    }
    const remaining = Math.max(0, (selectedDelivery?.order?.total ?? 0) - paymentTotal);
    if (amount > remaining) {
      setPaymentError("El monto no puede exceder el total restante.");
      return;
    }

    try {
      await createPayment({ orderId, paymentMethodId: selectedPaymentMethodId, amount });
      toast({ title: "Pago registrado" });
      setPaymentAmount("");
      setSelectedPaymentMethodId(null);
    } catch (err: any) {
      setPaymentError(err?.message || "No se pudo registrar el pago.");
    }
  };

  return (
    <DeliveryLayout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Mis entregas</h1>
          <p className="text-muted-foreground mt-1">Revisa los pedidos asignados por fecha y confirma las entregas.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Fecha</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10" />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente / Dirección</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Entrega</TableHead>
              <TableHead className="w-[140px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : deliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No hay entregas para esta fecha.
                </TableCell>
              </TableRow>
            ) : (
              deliveries.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold">#{d.order?.id}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{d.order?.customerName || d.order?.userName}</div>
                    <div className="text-xs text-muted-foreground">{d.order?.shippingAddress}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_COLORS[d.order?.status || "pending"]} text-[10px] uppercase tracking-wider border shadow-none`}>
                      {STATUS_LABELS[d.order?.status || "pending"] || d.order?.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {d.deliveryDate ? format(new Date(d.deliveryDate), "dd MMM yyyy") : "No asignado"}
                    </div>
                  </TableCell>
                  <TableCell className="flex flex-col gap-2">
                    <Button size="sm" variant="ghost" className="gap-2" onClick={() => setSelectedDelivery(d)}>
                      <Eye className="h-4 w-4" />
                      Ver
                    </Button>
                    {d.order?.status === "processing" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-2"
                        onClick={() => handleUpdateStatus(d.order?.id ?? 0, "shipped", "Pedido en camino")}
                      >
                        <Truck className="h-4 w-4" />
                        Marcar en camino
                      </Button>
                    )}

                    {d.order?.status === "shipped" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-2"
                        onClick={() => handleUpdateStatus(d.order?.id ?? 0, "delivered", "Pedido entregado")}
                      >
                        <Check className="h-4 w-4" />
                        Marcar entregado
                      </Button>
                    )}

                    {d.order?.status && d.order.status !== "delivered" && d.order.status !== "cancelled" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                        onClick={() => {
                          setCancelDelivery(d);
                          setCancelReason("");
                        }}
                      >
                        <X className="h-4 w-4" />
                        Cancelar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedDelivery} onOpenChange={(open) => !open && setSelectedDelivery(null)}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Pedido #{selectedDelivery?.order?.id}
            </DialogTitle>
          </DialogHeader>

          {selectedDelivery?.order && (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{selectedDelivery.order.customerName || selectedDelivery.order.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{selectedDelivery.order.userEmail}</span>
                </div>
                {selectedDelivery.order.shippingAddress && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dirección:</span>
                    <span className="text-right max-w-[260px]">{selectedDelivery.order.shippingAddress}</span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Artículos</h3>
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
                      {selectedDelivery.order.items.map((item: any) => (
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

              <div className="space-y-1 text-sm border-t border-border pt-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${selectedDelivery.order.subtotal?.toFixed(2) ?? selectedDelivery.order.total.toFixed(2)}</span>
                </div>
                {selectedDelivery.order.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1">Descuento ({selectedDelivery.order.discountCode})</span>
                    <span>-${selectedDelivery.order.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                  <span>Total</span>
                  <span>${selectedDelivery.order.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pagos</h3>
                  <span className="text-xs text-muted-foreground">Restante: ${Math.max(0, (selectedDelivery.order.total ?? 0) - paymentTotal).toFixed(2)}</span>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Fecha</th>
                        <th className="text-left px-3 py-2 font-medium">Método</th>
                        <th className="text-right px-3 py-2 font-medium">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingPayments ? (
                        <tr>
                          <td colSpan={3} className="text-center py-10 text-muted-foreground">
                            Cargando pagos...
                          </td>
                        </tr>
                      ) : (payments || []).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center py-10 text-muted-foreground">
                            No hay pagos registrados.
                          </td>
                        </tr>
                      ) : (
                        (payments || []).map((p: any) => (
                          <tr key={p.id} className="border-t border-border">
                            <td className="px-3 py-2.5">{format(new Date(p.createdAt), "d MMM yyyy HH:mm")}</td>
                            <td className="px-3 py-2.5">{p.paymentMethodName || "-"}</td>
                            <td className="px-3 py-2.5 text-right font-semibold">${p.amount.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border border-border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Método</Label>
                      <Select value={selectedPaymentMethodId?.toString() ?? ""} onValueChange={(v) => setSelectedPaymentMethodId(v ? parseInt(v) : null)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent>
                          {(paymentMethods || []).filter((m: any) => m.isActive).map((method: any) => (
                            <SelectItem key={method.id} value={method.id.toString()}>
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Monto</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button className="w-full" onClick={handleAddPayment}>
                        Registrar pago
                      </Button>
                    </div>
                  </div>
                  {paymentError && <p className="text-sm text-destructive mt-2">{paymentError}</p>}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedDelivery(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelDelivery} onOpenChange={(open) => !open && setCancelDelivery(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Cancelar pedido</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ingresa el motivo de la cancelación (visible en el historial).
            </p>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo de cancelación..."
              className="h-24"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelDelivery(null)}>
              Volver
            </Button>
            <Button type="button" variant="destructive" onClick={handleCancelDelivery} disabled={isCancelling}>
              {isCancelling ? "Cancelando..." : "Confirmar cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DeliveryLayout>
  );
}
