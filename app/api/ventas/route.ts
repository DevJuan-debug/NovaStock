import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const VentaSchema = z.object({
  mesaId: z.string().optional().nullable(),
  boliranaId: z.string().optional().nullable(),
  items: z.array(z.object({
    productoId: z.string(),
    cantidad: z.number().positive(),
    precioUnitario: z.number().positive(),
    descuento: z.number().min(0).max(100).default(0),
    subtotal: z.number().positive(),
  })),
  descuento: z.number().min(0).default(0),
  propina: z.number().min(0).default(0),
  metodoPago: z.enum(["EFECTIVO", "TARJETA", "NEQUI", "DAVIPLATA", "TRANSFERENCIA"]).optional(),
  estado: z.enum(["ABIERTA", "PAGADA"]).default("PAGADA"),
  observacion: z.string().optional(),
  esNocturno: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const estado = searchParams.get("estado");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const mesaId = searchParams.get("mesaId");
  const boliranaId = searchParams.get("boliranaId");

  const admin = createAdminClient();
  let query = admin
    .from("ventas")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (estado) query = query.eq("estado", estado);
  if (desde) query = query.gte("createdAt", new Date(desde).toISOString());
  if (hasta) query = query.lte("createdAt", new Date(hasta).toISOString());
  if (mesaId) query = query.eq("mesaId", mesaId);
  if (boliranaId) query = query.eq("boliranaId", boliranaId);

  const { data: ventas, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ventaIds = ventas?.map((v) => v.id) ?? [];
  const mesaIds = [...new Set(ventas?.filter((v) => v.mesaId).map((v) => v.mesaId))] as string[];
  const boliranaIds = [...new Set(ventas?.filter((v) => v.boliranaId).map((v) => v.boliranaId))] as string[];
  const userIds = [...new Set(ventas?.map((v) => v.userId))] as string[];

  const [mesasRes, boliranasRes, usersRes, detallesRes] = await Promise.all([
    mesaIds.length > 0 ? admin.from("mesas").select("id, numero").in("id", mesaIds) : { data: [] },
    boliranaIds.length > 0 ? admin.from("boliranas").select("id, numero").in("id", boliranaIds) : { data: [] },
    admin.from("users").select("id, nombre").in("id", userIds),
    ventaIds.length > 0 ? admin.from("detalles_venta").select("*, producto:productos(nombre)").in("ventaId", ventaIds) : { data: [] },
  ]);

  const result = ventas?.map((v) => ({
    ...v,
    mesa: (mesasRes.data as { id: string; numero: number }[])?.find((m) => m.id === v.mesaId) ?? null,
    bolirana: (boliranasRes.data as { id: string; numero: number }[])?.find((b) => b.id === v.boliranaId) ?? null,
    usuario: (usersRes.data as { id: string; nombre: string }[])?.find((u) => u.id === v.userId) ?? null,
    detalles: detallesRes.data?.filter((d) => d.ventaId === v.id) ?? [],
  }));

  return NextResponse.json({ ventas: result, total: count ?? 0, page, limit });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: dbUser } = await admin.from("users").select("id").eq("authId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const parsed = VentaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { items, mesaId, boliranaId, descuento, propina, metodoPago, estado, observacion, esNocturno } = parsed.data;

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const totalDescuento = subtotal * (descuento / 100);
  const total = subtotal - totalDescuento + propina;

  const { count } = await admin.from("ventas").select("id", { count: "exact", head: true });
  const numero = `VTA-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(5, "0")}`;
  const ventaId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { data: venta, error: ventaError } = await admin.from("ventas").insert({
    id: ventaId,
    numero,
    mesaId: mesaId ?? null,
    boliranaId: boliranaId ?? null,
    userId: dbUser.id,
    subtotal,
    descuento: totalDescuento,
    propina,
    total,
    metodoPago: metodoPago ?? "EFECTIVO",
    estado,
    esNocturno,
    observacion: observacion ?? null,
    updatedAt: now,
  }).select().single();

  if (ventaError) return NextResponse.json({ error: ventaError.message }, { status: 500 });

  if (items.length > 0) {
    await admin.from("detalles_venta").insert(
      items.map((i) => ({
        id: crypto.randomUUID(),
        ventaId,
        productoId: i.productoId,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        descuento: i.descuento,
        subtotal: i.subtotal,
      }))
    );
  }

  if (estado === "ABIERTA") {
    if (mesaId) await admin.from("mesas").update({ estado: "OCUPADA", updatedAt: now }).eq("id", mesaId);
    if (boliranaId) await admin.from("boliranas").update({ estado: "EN_USO", updatedAt: now }).eq("id", boliranaId);
    return NextResponse.json(venta, { status: 201 });
  }

  for (const item of items) {
    const { data: prod } = await admin.from("productos").select("stock").eq("id", item.productoId).single();
    await admin.from("productos").update({
      stock: Math.max(0, Number(prod?.stock ?? 0) - item.cantidad),
      updatedAt: now,
    }).eq("id", item.productoId);

    await admin.from("movimientos_inventario").insert({
      id: crypto.randomUUID(),
      productoId: item.productoId,
      tipo: "SALIDA",
      cantidad: item.cantidad,
      motivo: `Venta ${numero}`,
      referencia: ventaId,
      userId: dbUser.id,
      createdAt: now,
    });
  }

  await admin.from("movimientos_caja").insert({
    id: crypto.randomUUID(),
    tipo: "INGRESO",
    concepto: `Venta ${numero}`,
    monto: total,
    referencia: ventaId,
    userId: dbUser.id,
    createdAt: now,
  });

  if (mesaId) {
    await admin.from("mesas").update({ estado: "DISPONIBLE", updatedAt: now }).eq("id", mesaId);
  }
  if (boliranaId) {
    await admin.from("boliranas").update({ estado: "DISPONIBLE", updatedAt: now }).eq("id", boliranaId);
  }

  return NextResponse.json(venta, { status: 201 });
}
