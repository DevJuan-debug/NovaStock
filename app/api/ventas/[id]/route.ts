import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const UpdateSchema = z.object({
  items: z.array(z.object({
    productoId: z.string(),
    cantidad: z.number().positive(),
    precioUnitario: z.number().positive(),
    descuento: z.number().min(0).max(100).default(0),
    subtotal: z.number().positive(),
  })),
  descuento: z.number().min(0).default(0),
  propina: z.number().min(0).default(0),
  observacion: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data: venta, error } = await admin
    .from("ventas")
    .select("*, detalles:detalles_venta(*, producto:productos(*))")
    .eq("id", id)
    .single();

  if (error || !venta) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(venta);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: venta } = await admin.from("ventas").select("estado").eq("id", id).single();
  if (!venta || venta.estado !== "ABIERTA") {
    return NextResponse.json({ error: "Solo se pueden modificar ventas abiertas" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { items, descuento, propina, observacion } = parsed.data;
  const now = new Date().toISOString();
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const totalDescuento = subtotal * (descuento / 100);
  const total = subtotal - totalDescuento + propina;

  await admin.from("detalles_venta").delete().eq("ventaId", id);
  if (items.length > 0) {
    await admin.from("detalles_venta").insert(
      items.map((i) => ({
        id: crypto.randomUUID(),
        ventaId: id,
        productoId: i.productoId,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        descuento: i.descuento,
        subtotal: i.subtotal,
      }))
    );
  }

  const { data: updated } = await admin.from("ventas").update({
    subtotal,
    descuento: totalDescuento,
    propina,
    total,
    observacion: observacion ?? null,
    updatedAt: now,
  }).eq("id", id).select().single();

  return NextResponse.json(updated);
}
