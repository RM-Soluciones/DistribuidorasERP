import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useOrderPaymentsByDate } from "@/lib/supabase-hooks";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function AdminCashRegister() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data, isLoading } = useOrderPaymentsByDate({ dateFrom: date, dateTo: date });

  const totals = useMemo(() => {
    const payments = data || [];
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    const count = payments.length;
    return { total, count };
  }, [data]);

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Caja diaria</h1>
        <p className="text-muted-foreground mt-1">Resumen de cobros registrados por día.</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground">Fecha</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10" />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <div className="text-muted-foreground">Cobros</div>
            <div className="text-xl font-bold">{totals.count}</div>
          </div>
          <div className="text-sm">
            <div className="text-muted-foreground">Total recaudado</div>
            <div className="text-xl font-bold">${totals.total.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pago</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Hora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : (data || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No se encontraron cobros para esta fecha.
                </TableCell>
              </TableRow>
            ) : (
              (data || []).map((payment) => (
                <TableRow key={payment.id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold">#{payment.orderId}</TableCell>
                  <TableCell>{payment.order?.customerName || "-"}</TableCell>
                  <TableCell>{payment.paymentMethodName || "-"}</TableCell>
                  <TableCell>${payment.amount.toFixed(2)}</TableCell>
                  <TableCell>{format(new Date(payment.createdAt), "HH:mm")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
