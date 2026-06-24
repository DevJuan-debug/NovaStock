import { NominaView } from "@/components/nomina/nomina-view";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NominaPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { mes: mesParam } = await searchParams;
  const now = new Date();
  const mesActual = mesParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = mesActual.split("-").map(Number);
  const inicioMes = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const finMes = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const admin = createAdminClient();
  const { data: dbUser } = await admin.from("users").select("role").eq("authId", user.id).single();
  if (dbUser?.role !== "ADMIN") redirect("/dashboard");


  const [empleadosRes, pagosRes] = await Promise.all([
    admin.from("empleados").select("*").order("nombre", { ascending: true }),
    admin.from("pagos_nomina").select("*, empleado:empleadoId(nombre, cargo), registrador:registradoPor(nombre)")
      .gte("fecha", inicioMes)
      .lte("fecha", finMes)
      .order("fecha", { ascending: false })
      .order("createdAt", { ascending: false }),
  ]);

  const empleados = (empleadosRes.data ?? []) as any[];
  const pagosRaw = (pagosRes.data ?? []) as any[];

  // Supabase returns nested selects as objects; normalize to match client interface
  const pagos = pagosRaw.map((p: any) => ({
    ...p,
    empleado: p.empleado ?? null,
    registrador: p.registrador ?? null,
  }));

  const totalMes = pagos.reduce((s: number, p: any) => s + Number(p.monto), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nómina</h1>
        <p className="text-muted-foreground">Pagos al personal</p>
      </div>
      <NominaView
        empleados={empleados}
        pagos={pagos}
        totalMes={totalMes}
        mesActual={mesActual}
      />
    </div>
  );
}
