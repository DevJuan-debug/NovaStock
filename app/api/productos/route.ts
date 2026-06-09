import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const ProductoSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  precio: z.number().positive(),
  precioNocturno: z.number().positive().nullable().optional(),
  costo: z.number().min(0).default(0),
  categoriaId: z.string(),
  stock: z.number().min(0).default(0),
  stockMinimo: z.number().min(0).default(0),
  unidad: z.string().default("und"),
  activo: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoriaId = searchParams.get("categoriaId");
  const buscar = searchParams.get("q");
  const soloActivos = searchParams.get("activos") !== "false";

  const admin = createAdminClient();
  let query = admin
    .from("productos")
    .select("*, categoria:categorias(*)")
    .is("deletedAt", null)
    .order("nombre");

  if (soloActivos) query = query.eq("activo", true);
  if (categoriaId) query = query.eq("categoriaId", categoriaId);
  if (buscar) query = query.ilike("nombre", `%${buscar}%`);

  const { data: productos, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(productos);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = ProductoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: producto, error } = await admin
    .from("productos")
    .insert({ id: crypto.randomUUID(), ...parsed.data, updatedAt: now })
    .select("*, categoria:categorias(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(producto, { status: 201 });
}
