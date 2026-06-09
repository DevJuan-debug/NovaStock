import { ReportesView } from "@/components/reportes/reportes-view";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ReportesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">Análisis de ventas, inventario y contabilidad</p>
      </div>
      <ReportesView />
    </div>
  );
}
