import { PosView } from "@/components/pos/pos-view";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ mesa?: string; bolirana?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { mesa: mesaId, bolirana: boliranaId } = await searchParams;

  const admin = createAdminClient();
  const hoy = new Date().toISOString().split("T")[0];

  const [productosRes, categoriasRes, mesasRes, boliranasRes, promoRes, configRes] = await Promise.all([
    admin.from("productos").select("*, categoria:categorias(*)").eq("activo", true).is("deletedAt", null).order("nombre"),
    admin.from("categorias").select("*").eq("activo", true).order("nombre"),
    admin.from("mesas").select("*").is("deletedAt", null).order("numero"),
    admin.from("boliranas").select("*").is("deletedAt", null).order("numero"),
    admin.from("promociones").select("id, nombre, tipo, valor, productoId")
      .eq("activo", true)
      .or(`fechaInicio.is.null,fechaInicio.lte.${hoy}`)
      .or(`fechaFin.is.null,fechaFin.gte.${hoy}`),
    admin.from("configuracion").select("valor").eq("clave", "horaInicioNocturno").maybeSingle(),
  ]).catch(() => [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: null }]);

  let ventaAbierta = null;
  if (mesaId || boliranaId) {
    let q = admin
      .from("ventas")
      .select("*, detalles:detalles_venta(*, producto:productos(*))")
      .eq("estado", "ABIERTA");
    if (mesaId) q = q.eq("mesaId", mesaId);
    else if (boliranaId) q = q.eq("boliranaId", boliranaId);
    const { data } = await q.maybeSingle();
    ventaAbierta = data;
  }

  const horaInicioNocturno = (configRes.data as any)?.valor ?? "22:00";

  return (
    <div className="h-[calc(100vh-5rem)] -m-6">
      <PosView
        productos={(productosRes.data ?? []) as Parameters<typeof PosView>[0]["productos"]}
        categorias={(categoriasRes.data ?? []) as Parameters<typeof PosView>[0]["categorias"]}
        mesas={(mesasRes.data ?? []) as Parameters<typeof PosView>[0]["mesas"]}
        boliranas={(boliranasRes.data ?? []) as Parameters<typeof PosView>[0]["boliranas"]}
        promociones={(promoRes.data ?? []) as Parameters<typeof PosView>[0]["promociones"]}
        config={{ horaInicioNocturno }}
        initialMesaId={mesaId ?? null}
        initialBoliranaId={boliranaId ?? null}
        ventaAbierta={ventaAbierta as any}
      />
    </div>
  );
}
