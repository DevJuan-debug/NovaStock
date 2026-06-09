import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const MesaSchema = z.object({
  numero: z.number().int().positive(),
  nombre: z.string().optional(),
  capacidad: z.number().int().positive().default(4),
  zona: z.string().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: mesas, error } = await admin
    .from("mesas")
    .select("*")
    .is("deletedAt", null)
    .order("numero");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const mesaIds = mesas?.map((m) => m.id) ?? [];
  const { data: ventas } = await admin
    .from("ventas")
    .select("*, detalles:detalles_venta(*)")
    .in("mesaId", mesaIds)
    .eq("estado", "ABIERTA");

  const result = mesas?.map((m) => ({
    ...m,
    ventas: ventas?.filter((v) => v.mesaId === m.id) ?? [],
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = MesaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: mesa, error } = await admin
    .from("mesas")
    .insert({ id: crypto.randomUUID(), ...parsed.data, updatedAt: now })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(mesa, { status: 201 });
}
