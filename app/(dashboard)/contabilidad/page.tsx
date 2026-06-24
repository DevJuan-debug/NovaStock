import { ContabilidadView } from "@/components/contabilidad/contabilidad-view";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { startOfDay, startOfMonth } from "date-fns";

export default async function ContabilidadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: dbUser } = await admin.from("users").select("role").eq("authId", user.id).single();
  if (dbUser?.role !== "ADMIN") redirect("/dashboard");

  const hoy = startOfDay(new Date());
  const inicioMes = startOfMonth(new Date());

  const [movimientosHoyRes, movimientosMesRes, cierresRes] = await Promise.all([
    admin.from("movimientos_caja").select("*").gte("createdAt", hoy.toISOString()).order("createdAt", { ascending: false }),
    admin.from("movimientos_caja").select("tipo, monto").gte("createdAt", inicioMes.toISOString()),
    admin.from("cierres_caja").select("*").order("createdAt", { ascending: false }).limit(20),
  ]).catch(() => [{ data: [] as any[] }, { data: [] as any[] }, { data: [] as any[] }]);

  const movimientosHoy = movimientosHoyRes.data ?? [];
  const movimientosMes = movimientosMesRes.data ?? [];
  const cierresRaw = cierresRes.data ?? [];

  // Enrich movimientosHoy with usuario name
  const userIds = [...new Set(movimientosHoy.map((m: any) => m.userId).filter(Boolean))] as string[];
  const { data: usersData } = userIds.length > 0
    ? await admin.from("users").select("id, nombre").in("id", userIds)
    : { data: [] };

  const movimientosEnriquecidos = movimientosHoy.map((m: any) => ({
    ...m,
    usuario: (usersData as any[])?.find((u) => u.id === m.userId) ?? null,
  }));

  // Enrich cierres with usuario name
  const cierreUserIds = [...new Set(cierresRaw.map((c: any) => c.userId).filter(Boolean))] as string[];
  const { data: cierreUsersData } = cierreUserIds.length > 0
    ? await admin.from("users").select("id, nombre").in("id", cierreUserIds)
    : { data: [] };

  const cierres = cierresRaw.map((c: any) => ({
    ...c,
    usuario: (cierreUsersData as any[])?.find((u) => u.id === c.userId) ?? null,
  }));

  // JS-side groupBy for resumen mensual
  const ingresosMes = movimientosMes
    .filter((m: any) => m.tipo === "INGRESO")
    .reduce((s: number, m: any) => s + Number(m.monto), 0);
  const egresosMes = movimientosMes
    .filter((m: any) => m.tipo === "EGRESO")
    .reduce((s: number, m: any) => s + Number(m.monto), 0);

  const ingresosHoy = movimientosEnriquecidos
    .filter((m: any) => m.tipo === "INGRESO")
    .reduce((s, m: any) => s + Number(m.monto), 0);
  const egresosHoy = movimientosEnriquecidos
    .filter((m: any) => m.tipo === "EGRESO")
    .reduce((s, m: any) => s + Number(m.monto), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contabilidad</h1>
        <p className="text-muted-foreground">Control de caja, ingresos y egresos</p>
      </div>
      <ContabilidadView
        movimientosHoy={movimientosEnriquecidos as any}
        cierres={cierres as any}
        resumen={{
          ingresosHoy,
          egresosHoy,
          balanceHoy: ingresosHoy - egresosHoy,
          ingresosMes,
          egresosMes,
          balanceMes: ingresosMes - egresosMes,
        }}
      />
    </div>
  );
}
