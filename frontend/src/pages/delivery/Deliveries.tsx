import { useEffect, useMemo, useState } from "react";
import { DeliveryLayout } from "@/components/layout/DeliveryLayout";
import { useAuth } from "@/lib/auth-context";
import { useOrderDeliveries, useUpdateOrderStatus } from "@/lib/supabase-hooks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, Check } from "lucide-react";

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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deliveries = useMemo(() => data?.deliveries ?? [], [data]);

  const handleMarkDelivered = async (orderId: number) => {
    try {
      await updateOrderStatus({ id: orderId, data: { status: "delivered" } });
      queryClient.invalidateQueries({ queryKey: ["order-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Pedido entregado", description: "Marca como entregado." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo actualizar.", variant: "destructive" });
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
                  <TableCell>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-2"
                      disabled={d.order?.status === "delivered"}
                      onClick={() => handleMarkDelivered(d.order?.id ?? 0)}
                    >
                      <Check className="h-4 w-4" />
                      {d.order?.status === "delivered" ? "Entregado" : "Marcar entregado"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </DeliveryLayout>
  );
}
