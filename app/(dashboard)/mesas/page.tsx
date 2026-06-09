import { MesasView } from "@/components/mesas/mesas-view";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function MesasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  let mesas: any[] = [];
  try {
    const { data: mesasRaw } = await admin.from("mesas").select("*").is("deletedAt", null).order("numero");
    const ids = mesasRaw?.map((m) => m.id) ?? [];
    const { data: ventas } = ids.length > 0
      ? await admin.from("ventas").select("*, detalles:detalles_venta(*, producto:productos(*))").in("mesaId", ids).eq("estado", "ABIERTA")
      : { data: [] };
    mesas = mesasRaw?.map((m) => ({
      ...m,
      ventas: ventas?.filter((v: any) => v.mesaId === m.id) ?? [],
    })) ?? [];
  } catch {
    mesas = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mesas</h1>
        <p className="text-muted-foreground">Gestión de mesas del bar</p>
      </div>
      <MesasView initialMesas={mesas as any} />
    </div>
  );
}
