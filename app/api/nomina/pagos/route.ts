import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const PagoSchema = z.object({
  empleadoId: z.string().uuid(),
  monto: z.number().positive(),
  concepto: z.string().optional(),
  fecha: z.string(),
  metodoPago: z.enum(["EFECTIVO", "TRANSFERENCIA", "NEQUI", "DAVIPLATA", "TARJETA"]).default("EFECTIVO"),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes"); // YYYY-MM
  const empleadoId = searchParams.get("empleadoId");

  const admin = createAdminClient();
  let query = admin
    .from("pagos_nomina")
    .select("*")
    .order("fecha", { ascending: false })
    .order("createdAt", { ascending: false });

  if (mes) {
    const [year, month] = mes.split("-").map(Number);
    const inicio = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const fin = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    query = query.gte("fecha", inicio).lte("fecha", fin);
  }
  if (empleadoId) query = query.eq("empleadoId", empleadoId);

  const { data: pagos, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const empleadoIds = [...new Set((pagos ?? []).map((p) => p.empleadoId))] as string[];
  const { data: empleados } = empleadoIds.length > 0
    ? await admin.from("empleados").select("id, nombre, cargo").in("id", empleadoIds)
    : { data: [] };

  const userIds = [...new Set((pagos ?? []).map((p) => p.registradoPor).filter(Boolean))] as string[];
  const { data: users } = userIds.length > 0
    ? await admin.from("users").select("id, nombre").in("id", userIds)
    : { data: [] };

  const pagosEnriquecidos = (pagos ?? []).map((p) => ({
    ...p,
    empleado: (empleados as any[])?.find((e) => e.id === p.empleadoId) ?? null,
    registrador: (users as any[])?.find((u) => u.id === p.registradoPor) ?? null,
  }));

  const total = (pagos ?? []).reduce((s, p) => s + Number(p.monto), 0);
  return NextResponse.json({ pagos: pagosEnriquecidos, total });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: dbUser } = await admin.from("users").select("id").eq("authId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const parsed = PagoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: empleado } = await admin.from("empleados").select("nombre").eq("id", parsed.data.empleadoId).single();
  if (!empleado) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

  const now = new Date().toISOString();
  const pagoId = crypto.randomUUID();
  const cajaId = crypto.randomUUID();

  const conceptoCaja = parsed.data.concepto
    ? `Nómina - ${empleado.nombre} (${parsed.data.concepto})`
    : `Nómina - ${empleado.nombre}`;

  const { error: cajaError } = await admin.from("movimientos_caja").insert({
    id: cajaId,
    tipo: "EGRESO",
    concepto: conceptoCaja,
    monto: parsed.data.monto,
    referencia: `nomina:${pagoId}`,
    userId: dbUser.id,
    createdAt: now,
  });
  if (cajaError) return NextResponse.json({ error: cajaError.message }, { status: 500 });

  const { data: pago, error: pagoError } = await admin.from("pagos_nomina").insert({
    id: pagoId,
    empleadoId: parsed.data.empleadoId,
    monto: parsed.data.monto,
    concepto: parsed.data.concepto ?? null,
    fecha: parsed.data.fecha,
    metodoPago: parsed.data.metodoPago,
    registradoPor: dbUser.id,
    cajaMovimientoId: cajaId,
    createdAt: now,
  }).select().single();

  if (pagoError) return NextResponse.json({ error: pagoError.message }, { status: 500 });
  return NextResponse.json(pago, { status: 201 });
}
