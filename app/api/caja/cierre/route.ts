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

  const since = apertura["createdAt"] as string;

  const [{ data: movimientos }, { data: ventas }] = await Promise.all([
    admin.from("movimientos_caja").select("tipo, monto").gte("createdAt", since),
    admin.from("ventas").select("id, numero, total, metodoPago, createdAt, detalles:detalles_venta(productoId, cantidad, precioUnitario, subtotal, producto:productos(nombre))").eq("estado", "PAGADA").gte("createdAt", since).order("createdAt", { ascending: false }),
  ]);

  const totalIngresos = (movimientos ?? [])
    .filter((m) => m.tipo === "INGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);

  const totalEgresos = (movimientos ?? [])
    .filter((m) => m.tipo === "EGRESO")
    .reduce((s, m) => s + Number(m.monto), 0);

  const saldoBase = Number(apertura["saldoBase"]);
  const saldoFinal = saldoBase + totalIngresos - totalEgresos;

  // Agrupar detalles por producto sumando cantidades y subtotales
  const productosMap = new Map<string, { nombre: string; cantidad: number; subtotal: number }>();
  for (const v of ventas ?? []) {
    for (const d of (v as any).detalles ?? []) {
      const nombre = d.producto?.nombre ?? "Desconocido";
      const existing = productosMap.get(d.productoId);
      if (existing) {
        existing.cantidad += Number(d.cantidad);
        existing.subtotal += Number(d.subtotal);
      } else {
        productosMap.set(d.productoId, {
          nombre,
          cantidad: Number(d.cantidad),
          subtotal: Number(d.subtotal),
        });
      }
    }
  }

  const productosVendidos = Array.from(productosMap.entries())
    .map(([productoId, data]) => ({ productoId, ...data }))
    .sort((a, b) => b.cantidad - a.cantidad);

  return NextResponse.json({
    aperturaId: apertura["id"],
    periodoDesde: since,
    saldoBase,
    totalIngresos,
    totalEgresos,
    saldoFinal,
    ventas: (ventas ?? []).map((v) => ({
      id: v.id,
      numero: (v as any).numero,
      total: Number((v as any).total),
      metodoPago: (v as any).metodoPago,
      createdAt: (v as any).createdAt,
    })),
    productosVendidos,
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
