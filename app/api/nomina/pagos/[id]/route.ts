import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: pago } = await admin.from("pagos_nomina").select("cajaMovimientoId").eq("id", id).single();
  if (!pago) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

  if (pago.cajaMovimientoId) {
    await admin.from("movimientos_caja").delete().eq("id", pago.cajaMovimientoId);
  }

  const { error } = await admin.from("pagos_nomina").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
