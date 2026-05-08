import type { ReactNode } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopBar } from "@/components/shared/TopBar";
import { BottomTabBar } from "@/components/shared/BottomTabBar";
import { OnboardingTour } from "@/components/shared/OnboardingTour";
import { DemoBanner } from "@/components/shared/DemoBanner";
import { KeyboardShortcuts } from "@/components/shared/KeyboardShortcuts";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications/server";
import { getCurrentUserRole } from "@/lib/rbac";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const notifications = await getNotifications();
  const userRole = await getCurrentUserRole();

  // 즐겨찾기 (UX3)
  let bookmarks: { id: string; kind: "page" | "employee" | "vendor"; target: string; label: string }[] = [];
  if (user) {
    try {
      const { data } = await supabase
        .schema("chongmu")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bookmarks" as any)
        .select("id, kind, target, label")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (Array.isArray(data)) {
        bookmarks = data as unknown as typeof bookmarks;
      }
    } catch {
      /* fail-soft — 마이그레이션 미적용 시 */
    }
  }

  return (
    <div className="min-h-screen print:min-h-0">
      <Sidebar role={userRole} bookmarks={bookmarks} />
      <div className="md:ml-16 lg:ml-72 print:ml-0">
        <TopBar
          userEmail={user?.email ?? null}
          notifications={notifications}
          userRole={userRole}
        />
        <DemoBanner
          userEmail={user?.email ?? null}
          demoEmail={process.env.DEMO_EMAIL ?? null}
        />
        <main className="min-h-[calc(100vh-4rem)] pb-24 md:pb-8 print:min-h-0 print:pb-0">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-container-padding lg:py-8 print:max-w-none print:p-0">
            {children}
          </div>
        </main>
      </div>
      <BottomTabBar />
      <OnboardingTour />
      <KeyboardShortcuts />
    </div>
  );
}
