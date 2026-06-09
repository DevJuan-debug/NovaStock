import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const AperturaSchema = z.object({
  saldoBase: z.number().min(0),
});

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  let apertura: Record<string, any> | null = null;
  try {
    const res = await admin
      .from("aperturas_caja")
      .select("*")
      .eq("estado", "ABIERTA")
      .order("createdAt", { ascending: false })
      .limit(1)
      .single();
    apertura = res.data as Record<string, any>;
  } catch { apertura = null; }

  if (!apertura) return NextResponse.json(null);

  const { data: usuario } = await admin.from("users").select("nombre").eq("id", apertura["userId"]).single();
  return NextResponse.json({ ...apertura, usuario: usuario ?? null });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: dbUser } = await admin.from("users").select("id").eq("authId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Verificar que no haya caja abierta
  let abierta: { id: string } | null = null;
  try {
    const res = await admin.from("aperturas_caja").select("id").eq("estado", "ABIERTA").limit(1).single();
    abierta = res.data as { id: string };
  } catch { abierta = null; }

  if (abierta) return NextResponse.json({ error: "Ya hay una caja abierta" }, { status: 409 });

  const body = await req.json();
  const parsed = AperturaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const now = new Date().toISOString();
  const { data, error } = await admin.from("aperturas_caja").insert({
    id: crypto.randomUUID(),
    userId: dbUser.id,
    saldoBase: parsed.data.saldoBase,
    estado: "ABIERTA",
    createdAt: now,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
