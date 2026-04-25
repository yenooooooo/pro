import type { ReactNode } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopBar } from "@/components/shared/TopBar";
import { BottomTabBar } from "@/components/shared/BottomTabBar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:ml-16 lg:ml-72">
        <TopBar userEmail={user?.email ?? null} />
        <main className="min-h-[calc(100vh-4rem)] pb-24 md:pb-8">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-container-padding lg:py-8">
            {children}
          </div>
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
}
