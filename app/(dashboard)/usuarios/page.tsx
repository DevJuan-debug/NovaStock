import { UsuariosView } from "@/components/shared/usuarios-view";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  let dbUser: { role: string } | null = null;
  try {
    const { data } = await admin.from("users").select("role").eq("authId", user.id).single();
    dbUser = data;
  } catch { dbUser = null; }
  if (dbUser?.role !== "ADMIN") redirect("/dashboard");

  let usuarios: any[] = [];
  try {
    const { data } = await admin
      .from("users")
      .select("id, email, nombre, role, activo, createdAt")
      .is("deletedAt", null)
      .order("createdAt", { ascending: false });
    usuarios = data ?? [];
  } catch { usuarios = []; }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground">Gestión de usuarios y roles del sistema</p>
      </div>
      <UsuariosView usuarios={(usuarios ?? []) as any} />
    </div>
  );
}
