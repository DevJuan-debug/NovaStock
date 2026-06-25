import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const CompraSchema = z.object({
  proveedorId: z.string().uuid(),
  estado: z.enum(["PENDIENTE", "RECIBIDA"]).default("RECIBIDA"),
  observacion: z.string().optional(),
  detalles: z.array(z.object({
    productoId: z.string().uuid(),
    cantidad: z.number().positive(),
    precioUnitario: z.number().nonnegative(),
  })).min(1),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: compras, error } = await admin
    .from("compras")
    .select("*")
    .order("createdAt", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const compraIds = compras?.map((c) => c.id) ?? [];
  const proveedorIds = [...new Set(compras?.map((c) => c.proveedorId) ?? [])];

  const [detallesRes, proveedoresRes] = await Promise.all([
    compraIds.length > 0
      ? admin.from("detalles_compra").select("*, producto:productos(id, nombre)").in("compraId", compraIds)
      : { data: [] },
    proveedorIds.length > 0
      ? admin.from("proveedores").select("id, nombre").in("id", proveedorIds)
      : { data: [] },
  ]);

  const result = compras?.map((c) => ({
    ...c,
    proveedor: (proveedoresRes.data as { id: string; nombre: string }[])?.find((p) => p.id === c.proveedorId) ?? null,
    detalles: (detallesRes.data ?? []).filter((d) => d.compraId === c.id),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CompraSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createAdminClient();

  // Resolve DB user id
  const { data: dbUser } = await admin.from("users").select("id").eq("authId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 403 });

  const { proveedorId, estado, observacion, detalles } = parsed.data;
  const now = new Date().toISOString();

  const total = detalles.reduce((s, d) => s + d.cantidad * d.precioUnitario, 0);
  const compraId = crypto.randomUUID();

  // Create compra
  const { error: compraError } = await admin.from("compras").insert({
    id: compraId,
    proveedorId,
    userId: dbUser.id,
    total,
    estado,
    observacion: observacion || null,
    updatedAt: now,
  });
  if (compraError) return NextResponse.json({ error: compraError.message }, { status: 500 });

  // Create detalles
  const detallesRows = detalles.map((d) => ({
    id: crypto.randomUUID(),
    compraId,
    productoId: d.productoId,
    cantidad: d.cantidad,
    precioUnitario: d.precioUnitario,
    subtotal: d.cantidad * d.precioUnitario,
  }));
  const { error: detallesError } = await admin.from("detalles_compra").insert(detallesRows);
  if (detallesError) return NextResponse.json({ error: detallesError.message }, { status: 500 });

  // If RECIBIDA: update stock and create inventory movements
  if (estado === "RECIBIDA") {
    for (const d of detalles) {
      const { data: prod } = await admin.from("productos").select("stock").eq("id", d.productoId).single();
      const newStock = Number(prod?.stock ?? 0) + d.cantidad;

      await admin.from("productos").update({ stock: newStock, updatedAt: now }).eq("id", d.productoId);
      await admin.from("movimientos_inventario").insert({
        id: crypto.randomUUID(),
        productoId: d.productoId,
        tipo: "ENTRADA",
        cantidad: d.cantidad,
        motivo: `Compra a proveedor`,
        referencia: compraId,
        userId: dbUser.id,
      });
    }
  }

  return NextResponse.json({ id: compraId }, { status: 201 });
}
