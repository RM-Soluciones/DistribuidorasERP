import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useBusinessInfo, BusinessInfo } from "@/lib/use-business-info";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { info, loaded, update } = useBusinessInfo();
  const [form, setForm] = useState<BusinessInfo>({
    name: "",
    taxId: "",
    address: "",
    phone: "",
    email: "",
    footerNote: "",
    logo: undefined,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (loaded && info) {
      setForm(info);
    }
  }, [loaded, info]);

  const save = () => {
    update(form);
    toast({ title: "Configuración guardada" });
  };

  const handleLogoChange = async (file: File | null) => {
    if (!file) {
      setForm((f) => ({ ...f, logo: undefined }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, logo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Ajustes</h1>
        <p className="text-muted-foreground mt-1">Configura los datos de la empresa para las facturas.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label>Logo (opcional)</Label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
                {form.logo ? (
                  <img src={form.logo} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">Sin logo</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
                {form.logo && (
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    onClick={() => handleLogoChange(null)}
                  >
                    Eliminar logo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Nombre del negocio</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          <div className="space-y-3">
            <Label>CUIT / Tax ID</Label>
            <Input value={form.taxId} onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))} />
          </div>

          <div className="space-y-3">
            <Label>Dirección</Label>
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>

          <div className="space-y-3">
            <Label>Teléfono</Label>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>

          <div className="space-y-3">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-3">
          <Label>Footer (opcional)</Label>
          <Input value={form.footerNote} onChange={(e) => setForm((f) => ({ ...f, footerNote: e.target.value }))} />
          <p className="text-xs text-muted-foreground">Este texto aparecerá en los PDF de factura.</p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => info && setForm(info)}>
            Restaurar
          </Button>
          <Button onClick={save}>Guardar</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
