import { ProveedoresView } from "@/components/proveedores/proveedores-view";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ProveedoresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: dbUser } = await admin.from("users").select("role").eq("authId", user.id).single();
  if (dbUser?.role !== "ADMIN") redirect("/dashboard");

  const [proveedoresRes, productosRes, comprasRes] = await Promise.all([
    admin.from("proveedores").select("*").is("deletedAt", null).order("nombre"),
    admin.from("productos").select("id, nombre, activo, unidad").is("deletedAt", null).eq("activo", true).order("nombre"),
    admin.from("compras").select("*").order("createdAt", { ascending: false }).limit(100),
  ]);

  const compras = comprasRes.data ?? [];
  const compraIds = compras.map((c) => c.id);
  const proveedorIds = [...new Set(compras.map((c) => c.proveedorId))];

  const [detallesRes, provNombresRes] = await Promise.all([
    compraIds.length > 0
      ? admin.from("detalles_compra").select("*, producto:productos(id, nombre)").in("compraId", compraIds)
      : { data: [] },
    proveedorIds.length > 0
      ? admin.from("proveedores").select("id, nombre").in("id", proveedorIds)
      : { data: [] },
  ]);

  const comprasConRelaciones = compras.map((c) => ({
    ...c,
    proveedor: (provNombresRes.data as { id: string; nombre: string }[] ?? []).find((p) => p.id === c.proveedorId) ?? null,
    detalles: (detallesRes.data ?? []).filter((d: { compraId: string }) => d.compraId === c.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proveedores y Compras</h1>
        <p className="text-muted-foreground">Gestión de proveedores y registro de pagos</p>
      </div>
      <ProveedoresView
        proveedores={(proveedoresRes.data ?? []) as Parameters<typeof ProveedoresView>[0]["proveedores"]}
        compras={comprasConRelaciones as Parameters<typeof ProveedoresView>[0]["compras"]}
        productos={(productosRes.data ?? []) as Parameters<typeof ProveedoresView>[0]["productos"]}
      />
    </div>
  );
}
