import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const UserSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(1),
  role: z.enum(["ADMIN", "CAJERO", "MESERO", "BARTENDER"]),
  password: z.string().min(6),
});

const UpdateUserSchema = z.object({
  nombre: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "CAJERO", "MESERO", "BARTENDER"]).optional(),
  activo: z.boolean().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: dbUser } = await admin.from("users").select("role").eq("authId", user.id).single();
  if (dbUser?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: usuarios, error } = await admin
    .from("users")
    .select("id, email, nombre, role, activo, createdAt")
    .is("deletedAt", null)
    .order("createdAt", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(usuarios);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: adminUser } = await admin.from("users").select("role").eq("authId", user.id).single();
  if (adminUser?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = UserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "Error creating auth user" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: newUser, error } = await admin.from("users").insert({
    id: crypto.randomUUID(),
    authId: authData.user.id,
    email: parsed.data.email,
    nombre: parsed.data.nombre,
    role: parsed.data.role,
    updatedAt: now,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(newUser, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: adminUser } = await admin.from("users").select("role").eq("authId", user.id).single();
  if (adminUser?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, ...rest } = body;
  const parsed = UpdateUserSchema.safeParse(rest);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: updated, error } = await admin
    .from("users")
    .update({ ...parsed.data, updatedAt: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(updated);
}
