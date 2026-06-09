import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const PromoSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  tipo: z.enum(["PORCENTAJE", "MONTO"]).default("PORCENTAJE"),
  valor: z.number().positive(),
  productoId: z.string().nullable().optional(),
  activo: z.boolean().default(true),
  fechaInicio: z.string().nullable().optional(),
  fechaFin: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const soloActivas = searchParams.get("activas") === "true";

  const admin = createAdminClient();
  let query = admin.from("promociones").select("*").order("createdAt", { ascending: false });
  if (soloActivas) {
    const hoy = new Date().toISOString().split("T")[0];
    query = query
      .eq("activo", true)
      .or(`fechaInicio.is.null,fechaInicio.lte.${hoy}`)
      .or(`fechaFin.is.null,fechaFin.gte.${hoy}`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with producto name
  const productoIds = [...new Set((data ?? []).map((p) => p.productoId).filter(Boolean))] as string[];
  const { data: productos } = productoIds.length > 0
    ? await admin.from("productos").select("id, nombre").in("id", productoIds)
    : { data: [] };

  const result = (data ?? []).map((p) => ({
    ...p,
    producto: (productos as any[])?.find((pr) => pr.id === p.productoId) ?? null,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const body = await req.json();
  const parsed = PromoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const now = new Date().toISOString();
  const { data, error } = await admin.from("promociones").insert({
    id: crypto.randomUUID(),
    ...parsed.data,
    productoId: parsed.data.productoId ?? null,
    fechaInicio: parsed.data.fechaInicio ?? null,
    fechaFin: parsed.data.fechaFin ?? null,
    createdAt: now,
    updatedAt: now,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
