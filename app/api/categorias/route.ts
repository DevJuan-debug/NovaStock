import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const CategoriaSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  color: z.string().default("#6366f1"),
  icono: z.string().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: categorias, error } = await admin
    .from("categorias")
    .select("*")
    .eq("activo", true)
    .order("nombre");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const categoriasIds = categorias?.map((c) => c.id) ?? [];
  const { data: productos } = await admin
    .from("productos")
    .select("categoriaId")
    .in("categoriaId", categoriasIds)
    .eq("activo", true)
    .is("deletedAt", null);

  const result = categorias?.map((c) => ({
    ...c,
    _count: { productos: productos?.filter((p) => p.categoriaId === c.id).length ?? 0 },
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CategoriaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: categoria, error } = await admin
    .from("categorias")
    .insert({ id: crypto.randomUUID(), ...parsed.data, updatedAt: now })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(categoria, { status: 201 });
}
