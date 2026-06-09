import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { startOfDay } from "date-fns";

const MovimientoSchema = z.object({
  tipo: z.enum(["INGRESO", "EGRESO"]),
  concepto: z.string().min(1),
  monto: z.number().positive(),
  referencia: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "30");

  const desdeDate = desde ? new Date(desde) : startOfDay(new Date());
  const admin = createAdminClient();

  let query = admin
    .from("movimientos_caja")
    .select("*")
    .gte("createdAt", desdeDate.toISOString())
    .order("createdAt", { ascending: false });

  if (hasta) query = query.lte("createdAt", new Date(hasta).toISOString());

  const { data: todos } = await query;

  const ingresos = todos?.filter((m) => m.tipo === "INGRESO").reduce((s, m) => s + Number(m.monto), 0) ?? 0;
  const egresos = todos?.filter((m) => m.tipo === "EGRESO").reduce((s, m) => s + Number(m.monto), 0) ?? 0;

  const movimientosPag = todos?.slice((page - 1) * limit, page * limit) ?? [];
  const userIds = [...new Set(movimientosPag.map((m) => m.userId))] as string[];
  const { data: users } = await admin.from("users").select("id, nombre").in("id", userIds);

  const movimientos = movimientosPag.map((m) => ({
    ...m,
    usuario: users?.find((u) => u.id === m.userId) ?? null,
  }));

  return NextResponse.json({
    movimientos,
    resumen: { ingresos, egresos, balance: ingresos - egresos },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: dbUser } = await admin.from("users").select("id").eq("authId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const parsed = MovimientoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const now = new Date().toISOString();
  const { data: movimiento, error } = await admin.from("movimientos_caja").insert({
    id: crypto.randomUUID(),
    ...parsed.data,
    userId: dbUser.id,
    createdAt: now,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(movimiento, { status: 201 });
}
