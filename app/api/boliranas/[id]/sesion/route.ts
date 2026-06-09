import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: dbUser } = await admin.from("users").select("id").eq("authId", user.id).single();
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const { accion, ventaId } = body;

  const { data: bolirana } = await admin.from("boliranas").select("*").eq("id", id).single();
  if (!bolirana) return NextResponse.json({ error: "Bolirana not found" }, { status: 404 });

  const now = new Date().toISOString();

  if (accion === "iniciar") {
    const { data: sesionActiva } = await admin
      .from("sesiones_bolirana")
      .select("id")
      .eq("boliranaId", id)
      .is("fin", null)
      .maybeSingle();

    if (sesionActiva) return NextResponse.json({ error: "La bolirana ya tiene una sesión activa" }, { status: 400 });

    const sesionId = crypto.randomUUID();
    const { error: sesionError } = await admin.from("sesiones_bolirana").insert({
      id: sesionId,
      boliranaId: id,
      ventaId,
      inicio: now,
      costo: 0,
      createdAt: now,
    });
    if (sesionError) return NextResponse.json({ error: sesionError.message }, { status: 500 });

    await admin.from("boliranas").update({ estado: "EN_USO", updatedAt: now }).eq("id", id);

    const { data: sesion } = await admin.from("sesiones_bolirana").select("*").eq("id", sesionId).single();
    return NextResponse.json(sesion, { status: 201 });
  }

  if (accion === "finalizar") {
    const { data: sesion } = await admin
      .from("sesiones_bolirana")
      .select("*")
      .eq("boliranaId", id)
      .is("fin", null)
      .maybeSingle();

    if (!sesion) return NextResponse.json({ error: "No hay sesión activa" }, { status: 400 });

    const fin = new Date();
    const duracion = Math.ceil((fin.getTime() - new Date(sesion.inicio).getTime()) / (1000 * 60));
    const costo = (duracion / 60) * Number(bolirana.precioPorHora);
    const finStr = fin.toISOString();

    await admin.from("sesiones_bolirana").update({ fin: finStr, duracion, costo }).eq("id", sesion.id);
    await admin.from("boliranas").update({ estado: "DISPONIBLE", updatedAt: finStr }).eq("id", id);

    const { data: sesionActualizada } = await admin.from("sesiones_bolirana").select("*").eq("id", sesion.id).single();
    return NextResponse.json(sesionActualizada);
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
