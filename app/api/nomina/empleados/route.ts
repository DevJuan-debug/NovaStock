import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const EmpleadoSchema = z.object({
  nombre: z.string().min(1),
  cargo: z.string().optional(),
  jornal: z.number().min(0).optional(),
  notas: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const includeInactivos = searchParams.get("includeInactivos") === "true";

  const admin = createAdminClient();
  let query = admin.from("empleados").select("*").order("nombre", { ascending: true });
  if (!includeInactivos) query = query.eq("activo", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const body = await req.json();
  const parsed = EmpleadoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const now = new Date().toISOString();
  const { data, error } = await admin.from("empleados").insert({
    id: crypto.randomUUID(),
    nombre: parsed.data.nombre,
    cargo: parsed.data.cargo ?? null,
    jornal: parsed.data.jornal ?? 0,
    notas: parsed.data.notas ?? null,
    activo: true,
    createdAt: now,
    updatedAt: now,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
