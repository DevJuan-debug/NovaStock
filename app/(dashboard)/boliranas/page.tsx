import { BoliranaView } from "@/components/mesas/bolirana-view";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function BoliranaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  let boliranas: any[] = [];
  try {
    const { data: boliranasRaw } = await admin.from("boliranas").select("*").is("deletedAt", null).order("numero");
    const ids = boliranasRaw?.map((b) => b.id) ?? [];
    if (ids.length > 0) {
      const [{ data: sesiones }, { data: ventas }] = await Promise.all([
        admin.from("sesiones_bolirana").select("*").in("boliranaId", ids).is("fin", null),
        admin.from("ventas").select("*, detalles:detalles_venta(*, producto:productos(*))").in("boliranaId", ids).eq("estado", "ABIERTA"),
      ]);
      boliranas = boliranasRaw?.map((b) => ({
        ...b,
        sesiones: sesiones?.filter((s: any) => s.boliranaId === b.id) ?? [],
        ventas: ventas?.filter((v: any) => v.boliranaId === b.id) ?? [],
      })) ?? [];
    } else {
      boliranas = [];
    }
  } catch {
    boliranas = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Boliranas</h1>
        <p className="text-muted-foreground">Gestión de boliranas y control de tiempo</p>
      </div>
      <BoliranaView initialBoliranas={boliranas as any} />
    </div>
  );
}
