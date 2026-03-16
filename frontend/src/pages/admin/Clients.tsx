import { AdminLayout } from "@/components/layout/AdminLayout";
import { useClientAccounts } from "@/lib/supabase-hooks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdminClients() {
  const { data: clients, isLoading } = useClientAccounts();

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground mt-1">Cuenta corriente y movimientos de clientes.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Total pedidos</TableHead>
              <TableHead className="text-right">Pagos</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Último pedido</TableHead>
              <TableHead>Último pago</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : (clients || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No se encontraron clientes.
                </TableCell>
              </TableRow>
            ) : (
              (clients || []).map((client) => (
                <TableRow key={client.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="font-medium">{client.name}</div>
                    <div className="text-xs text-muted-foreground">{client.phone || "-"}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{client.email}</TableCell>
                  <TableCell className="text-right">${client.totalOrders.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${client.totalPayments.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={client.balance > 0 ? "secondary" : "default"}
                      className="text-xs"
                    >
                      ${client.balance.toFixed(2)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {client.lastOrderAt ? format(new Date(client.lastOrderAt), "d MMM yyyy") : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {client.lastPaymentAt ? format(new Date(client.lastPaymentAt), "d MMM yyyy") : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
