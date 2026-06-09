import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const PagarSchema = z.object({
  metodoPago: z.enum(["EFECTIVO", "TARJETA", "NEQUI", "DAVIPLATA", "TRANSFERENCIA"]),
  propina: z.number().min(0).default(0),
  descuento: z.number().min(0).default(0),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data: dbUser } = await admin.from("users").select("id").eq("authId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: venta } = await admin
    .from("ventas")
    .select("*, detalles:detalles_venta(*)")
    .eq("id", id)
    .single();

  if (!venta || venta.estado !== "ABIERTA") {
    return NextResponse.json({ error: "Venta no encontrada o ya pagada" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = PagarSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { metodoPago, propina, descuento } = parsed.data;
  const now = new Date().toISOString();

  const items = venta.detalles as { productoId: string; cantidad: number; subtotal: number }[];
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.subtotal), 0);
  const totalDescuento = subtotal * (descuento / 100);
  const total = subtotal - totalDescuento + propina;

  for (const item of items) {
    const { data: prod } = await admin.from("productos").select("stock").eq("id", item.productoId).single();
    await admin.from("productos").update({
      stock: Math.max(0, Number(prod?.stock ?? 0) - Number(item.cantidad)),
      updatedAt: now,
    }).eq("id", item.productoId);

    await admin.from("movimientos_inventario").insert({
      id: crypto.randomUUID(),
      productoId: item.productoId,
      tipo: "SALIDA",
      cantidad: item.cantidad,
      motivo: `Venta ${venta.numero}`,
      referencia: id,
      userId: dbUser.id,
      createdAt: now,
    });
  }

  const { data: updated } = await admin.from("ventas").update({
    estado: "PAGADA",
    metodoPago,
    subtotal,
    descuento: totalDescuento,
    propina,
    total,
    updatedAt: now,
  }).eq("id", id).select().single();

  await admin.from("movimientos_caja").insert({
    id: crypto.randomUUID(),
    tipo: "INGRESO",
    concepto: `Venta ${venta.numero}`,
    monto: total,
    referencia: id,
    userId: dbUser.id,
    createdAt: now,
  });

  if (venta.mesaId) {
    await admin.from("mesas").update({ estado: "DISPONIBLE", updatedAt: now }).eq("id", venta.mesaId);
  }
  if (venta.boliranaId) {
    await admin.from("boliranas").update({ estado: "DISPONIBLE", updatedAt: now }).eq("id", venta.boliranaId);
  }

  return NextResponse.json(updated);
}
