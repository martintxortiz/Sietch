import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-svh bg-background">
      <AppSidebar />
      <main className="flex min-w-0 flex-1 p-4 pt-6 !px-20 sm:p-6">
        <div className="mx-auto flex w-full">{children}</div>
      </main>
    </div>
  );
}
