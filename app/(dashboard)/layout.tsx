import type { ReactNode } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopBar } from "@/components/shared/TopBar";
import { BottomTabBar } from "@/components/shared/BottomTabBar";
import { OnboardingTour } from "@/components/shared/OnboardingTour";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications/server";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const notifications = await getNotifications();

  return (
    <div className="min-h-screen print:min-h-0">
      <Sidebar />
      <div className="md:ml-16 lg:ml-72 print:ml-0">
        <TopBar userEmail={user?.email ?? null} notifications={notifications} />
        <main className="min-h-[calc(100vh-4rem)] pb-24 md:pb-8 print:min-h-0 print:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-container-padding lg:py-8 print:max-w-none print:p-0">
            {children}
          </div>
        </main>
      </div>
      <BottomTabBar />
      <OnboardingTour />
    </div>
  );
}
