import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  let dbUser: { nombre: string; email: string; role: string } | null = null;
  try {
    const { data } = await admin.from("users").select("nombre, email, role").eq("authId", user.id).single();
    dbUser = data;
  } catch {
    dbUser = null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={dbUser?.role ?? ""} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header
          userEmail={dbUser?.email ?? user.email ?? ""}
          userName={dbUser?.nombre ?? ""}
          userRole={dbUser?.role ?? ""}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
