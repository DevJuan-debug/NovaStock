import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// GET: preview del cierre sin crearlo
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  let apertura: Record<string, any> | null = null;
  try {
    const res = await admin
      .from("aperturas_caja")
      .select("*")
      .eq("estado", "ABIERTA")
      .order("createdAt", { ascending: false })
      .limit(1)
      .single();
    apertura = res.data as Record<string, any>;
  } catch { apertura = null; }

  if (!apertura) return NextResponse.json({ error: "No hay caja abierta" }, { status: 404 });

  const { data: movimientos } = await admin
    .from("movimientos_caja")
    .select("tipo, monto")
    .gte("createdAt", apertura["createdAt"] as string);

  const totalIngresos = (movimientos ?? [])
    .filter((m) => m.tipo === "INGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);

  const totalEgresos = (movimientos ?? [])
    .filter((m) => m.tipo === "EGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);

  const saldoBase = Number(apertura["saldoBase"]);
  const saldoFinal = saldoBase + totalIngresos - totalEgresos;

  return NextResponse.json({
    aperturaId: apertura["id"],
    periodoDesde: apertura["createdAt"],
    saldoBase,
    totalIngresos,
    totalEgresos,
    saldoFinal,
  });
}

const CierreSchema = z.object({
  observaciones: z.string().optional(),
});

// POST: crear el cierre
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: dbUser } = await admin.from("users").select("id").eq("authId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let apertura: Record<string, any> | null = null;
  try {
    const res = await admin
      .from("aperturas_caja")
      .select("*")
      .eq("estado", "ABIERTA")
      .order("createdAt", { ascending: false })
      .limit(1)
      .single();
    apertura = res.data as Record<string, any>;
  } catch { apertura = null; }

  if (!apertura) return NextResponse.json({ error: "No hay caja abierta" }, { status: 404 });

  const body = await req.json();
  const parsed = CierreSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: movimientos } = await admin
    .from("movimientos_caja")
    .select("tipo, monto")
    .gte("createdAt", apertura["createdAt"] as string);

  const totalIngresos = (movimientos ?? [])
    .filter((m) => m.tipo === "INGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);

  const totalEgresos = (movimientos ?? [])
    .filter((m) => m.tipo === "EGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);

  const saldoBase = Number(apertura["saldoBase"]);
  const saldoFinal = saldoBase + totalIngresos - totalEgresos;

  const now = new Date().toISOString();
  const cierreId = crypto.randomUUID();

  const { data: cierre, error: cierreError } = await admin.from("cierres_caja").insert({
    id: cierreId,
    userId: dbUser.id,
    saldoInicial: saldoBase,
    totalIngresos,
    totalEgresos,
    saldoFinal,
    observaciones: parsed.data.observaciones ?? null,
    createdAt: now,
  }).select().single();

  if (cierreError) return NextResponse.json({ error: cierreError.message }, { status: 500 });

  await admin.from("aperturas_caja").update({
    estado: "CERRADA",
    cierreId,
    closedAt: now,
  }).eq("id", apertura["id"] as string);

  return NextResponse.json(cierre, { status: 201 });
}
