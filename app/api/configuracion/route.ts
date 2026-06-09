import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clave = searchParams.get("clave");

  const admin = createAdminClient();
  if (clave) {
    let valor: string | null = null;
    try {
      const res = await admin.from("configuracion").select("valor").eq("clave", clave).single();
      valor = (res.data as any)?.valor ?? null;
    } catch { valor = null; }
    return NextResponse.json({ clave, valor });
  }

  const { data } = await admin.from("configuracion").select("*");
  return NextResponse.json(data ?? []);
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clave, valor } = await req.json();
  if (!clave || valor === undefined) {
    return NextResponse.json({ error: "clave y valor requeridos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("configuracion").upsert({
    clave,
    valor: String(valor),
    updatedAt: new Date().toISOString(),
  }, { onConflict: "clave" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clave, valor });
}
