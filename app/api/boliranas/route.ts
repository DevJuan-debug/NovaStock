import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const BoliranaSchema = z.object({
  nombre: z.string().min(1),
  precioPorHora: z.number().positive().default(20000),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: boliranas, error } = await admin
    .from("boliranas")
    .select("*")
    .is("deletedAt", null)
    .order("numero");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const boliranaIds = boliranas?.map((b) => b.id) ?? [];
  const [{ data: sesiones }, { data: ventas }] = await Promise.all([
    admin.from("sesiones_bolirana").select("*").in("boliranaId", boliranaIds).is("fin", null),
    admin.from("ventas").select("*, detalles:detalles_venta(*)").in("boliranaId", boliranaIds).eq("estado", "ABIERTA"),
  ]);

  const result = boliranas?.map((b) => ({
    ...b,
    sesiones: sesiones?.filter((s) => s.boliranaId === b.id) ?? [],
    ventas: ventas?.filter((v) => v.boliranaId === b.id) ?? [],
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = BoliranaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createAdminClient();
  const { data: rows } = await admin.from("boliranas").select("numero").order("numero", { ascending: false }).limit(1);
  const numero = (rows?.[0]?.numero ?? 0) + 1;
  const now = new Date().toISOString();
  const { data: bolirana, error } = await admin
    .from("boliranas")
    .insert({ id: crypto.randomUUID(), numero, ...parsed.data, updatedAt: now })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(bolirana, { status: 201 });
}
