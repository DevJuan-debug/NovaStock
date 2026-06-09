import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const MovimientoSchema = z.object({
  productoId: z.string(),
  tipo: z.enum(["ENTRADA", "SALIDA", "AJUSTE"]),
  cantidad: z.number().positive(),
  motivo: z.string().optional(),
  referencia: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const productoId = searchParams.get("productoId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "30");

  const admin = createAdminClient();
  let query = admin
    .from("movimientos_inventario")
    .select("*")
    .order("createdAt", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (productoId) query = query.eq("productoId", productoId);

  const { data: movimientos, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const productoIds = [...new Set(movimientos?.map((m) => m.productoId))] as string[];
  const userIds = [...new Set(movimientos?.map((m) => m.userId))] as string[];

  const [productosRes, usersRes] = await Promise.all([
    admin.from("productos").select("id, nombre, unidad").in("id", productoIds),
    admin.from("users").select("id, nombre").in("id", userIds),
  ]);

  const result = movimientos?.map((m) => ({
    ...m,
    producto: productosRes.data?.find((p) => p.id === m.productoId) ?? null,
    usuario: usersRes.data?.find((u) => u.id === m.userId) ?? null,
  }));

  return NextResponse.json(result);
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

  const { productoId, tipo, cantidad, motivo, referencia } = parsed.data;
  const now = new Date().toISOString();

  const { data: prod } = await admin.from("productos").select("stock").eq("id", productoId).single();
  const stockActual = Number(prod?.stock ?? 0);

  if (tipo === "SALIDA" && stockActual < cantidad) {
    return NextResponse.json({ error: "Stock insuficiente" }, { status: 400 });
  }

  const nuevoStock =
    tipo === "ENTRADA" ? stockActual + cantidad :
    tipo === "SALIDA"  ? stockActual - cantidad :
    cantidad;

  await admin.from("productos").update({ stock: nuevoStock, updatedAt: now }).eq("id", productoId);

  const { data: movimiento, error } = await admin.from("movimientos_inventario").insert({
    id: crypto.randomUUID(),
    productoId,
    tipo,
    cantidad,
    motivo: motivo ?? null,
    referencia: referencia ?? null,
    userId: dbUser.id,
    createdAt: now,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(movimiento, { status: 201 });
}
