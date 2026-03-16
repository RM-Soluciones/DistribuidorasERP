import { useMemo } from "react";
import { useParams } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useOrder } from "@/lib/supabase-hooks";
import { useBusinessInfo } from "@/lib/use-business-info";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Printer } from "lucide-react";

export default function AdminInvoice() {
  const params = useParams();
  const orderId = parseInt(params.id || "", 10);
  const { data: order, isLoading } = useOrder(orderId);
  const { info } = useBusinessInfo();

  const totalItems = useMemo(() => order?.items?.reduce((s: number, i: any) => s + i.quantity, 0) ?? 0, [order]);

  if (isLoading || !order) {
    return (
      <AdminLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-muted-foreground">Cargando factura...</div>
        </div>
      </AdminLayout>
    );
  }

  const printedAt = format(new Date(), "dd MMM yyyy HH:mm");

  return (
    <AdminLayout>
      <div className="printable">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-4">
              {info?.logo ? (
                <img src={info.logo} alt="Logo" className="h-16 w-16 object-contain" />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                  Logo
                </div>
              )}
              <div>
                <h1 className="text-3xl font-display font-bold">Factura #{order.id}</h1>
                <p className="text-muted-foreground">Generada el {printedAt}</p>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.print()} className="gap-2 no-print">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-lg font-semibold">Empresa</h2>
              <p className="text-sm">{info?.name || "Nombre de la empresa"}</p>
              <p className="text-sm">{info?.address}</p>
              <p className="text-sm">CUIT: {info?.taxId}</p>
              <p className="text-sm">Tel: {info?.phone}</p>
              <p className="text-sm">Email: {info?.email}</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Cliente</h2>
              <p className="text-sm">{order.customerName || order.userName}</p>
              <p className="text-sm">{order.userEmail}</p>
              {order.shippingAddress && <p className="text-sm">{order.shippingAddress}</p>}
              <div className="mt-3">
                <Badge className="text-xs uppercase" variant="secondary">
                  {order.isPOS ? "Punto de Venta" : "Pedido Web"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Resumen</h3>
          <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
            <div>
              <div className="text-muted-foreground">Fecha</div>
              <div>{format(new Date(order.createdAt), "dd MMM yyyy HH:mm")}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Items</div>
              <div>{totalItems} unidades</div>
            </div>
            <div>
              <div className="text-muted-foreground">Estado</div>
              <div>{order.status}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total</div>
              <div className="font-bold">${order.total.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Detalle</h3>
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2">Producto</th>
                <th className="text-right px-3 py-2">Cantidad</th>
                <th className="text-right px-3 py-2">Precio</th>
                <th className="text-right px-3 py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: any) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-3 py-2">{item.productName}</td>
                  <td className="px-3 py-2 text-right">{item.quantity}</td>
                  <td className="px-3 py-2 text-right">${item.unitPrice.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">${item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-sm">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>${order.subtotal?.toFixed(2) ?? "0.00"}</span>
            </div>
            {order.discountAmount && order.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento</span>
                <span>-${order.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold mt-2">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
            {info?.footerNote && (
              <div className="mt-6 text-xs text-muted-foreground">{info.footerNote}</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
