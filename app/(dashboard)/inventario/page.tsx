import { InventarioView } from "@/components/inventario/inventario-view";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function InventarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [productosRes, categoriasRes] = await Promise.all([
    admin.from("productos").select("*, categoria:categorias(*)").is("deletedAt", null).order("nombre"),
    admin.from("categorias").select("*").eq("activo", true).order("nombre"),
  ]).catch(() => [{ data: [] }, { data: [] }]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground">Control de productos, stock y movimientos</p>
      </div>
      <InventarioView
        productos={(productosRes.data ?? []) as Parameters<typeof InventarioView>[0]["productos"]}
        categorias={(categoriasRes.data ?? []) as Parameters<typeof InventarioView>[0]["categorias"]}
      />
    </div>
  );
}
