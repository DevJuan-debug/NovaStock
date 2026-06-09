import { PromocionesView } from "@/components/promociones/promociones-view";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PromocionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const [promoRes, productosRes, configRes] = await Promise.all([
    admin.from("promociones").select("*").order("createdAt", { ascending: false }),
    admin.from("productos").select("id, nombre").eq("activo", true).is("deletedAt", null).order("nombre"),
    admin.from("configuracion").select("valor").eq("clave", "horaInicioNocturno").maybeSingle(),
  ]);

  const promoRaw = (promoRes.data ?? []) as any[];
  const productos = (productosRes.data ?? []) as any[];

  // Enrich promos with producto name
  const productoIds = [...new Set(promoRaw.map((p) => p.productoId).filter(Boolean))] as string[];
  const { data: productoMap } = productoIds.length > 0
    ? await admin.from("productos").select("id, nombre").in("id", productoIds)
    : { data: [] };

  const promociones = promoRaw.map((p) => ({
    ...p,
    producto: (productoMap as any[])?.find((pr) => pr.id === p.productoId) ?? null,
  }));

  const horaInicioNocturno = (configRes.data as any)?.valor ?? "22:00";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Promociones</h1>
        <p className="text-muted-foreground">Descuentos, ofertas y precios nocturnos</p>
      </div>
      <PromocionesView
        promociones={promociones as any}
        productos={productos}
        horaInicioNocturno={horaInicioNocturno}
      />
    </div>
  );
}
