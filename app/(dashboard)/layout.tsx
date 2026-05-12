import type { ReactNode } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopBar } from "@/components/shared/TopBar";
import { BottomTabBar } from "@/components/shared/BottomTabBar";
import { OnboardingTour } from "@/components/shared/OnboardingTour";
import { DemoBanner } from "@/components/shared/DemoBanner";
import { KeyboardShortcuts } from "@/components/shared/KeyboardShortcuts";
import { AmbientBackground } from "@/components/shared/AmbientBackground";
import { PulseSweep } from "@/components/shared/PulseSweep";
import { BootSequence } from "@/components/shared/BootSequence";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications/server";
import { getCurrentUserRole } from "@/lib/rbac";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();

  // ★ 모든 layout fetch 를 병렬화 — 직렬 4회 호출 → 1라운드 트립
  const [userResult, notifications, userRole] = await Promise.all([
    supabase.auth.getUser().catch(() => ({ data: { user: null } })),
    getNotifications().catch((err) => {
      console.error("[layout] notifications failed:", err);
      return [] as Awaited<ReturnType<typeof getNotifications>>;
    }),
    getCurrentUserRole().catch((err) => {
      console.error("[layout] userRole failed:", err);
      return "admin" as Awaited<ReturnType<typeof getCurrentUserRole>>;
    }),
  ]);
  const user = userResult.data.user;

  // 즐겨찾기 (UX3) — user 의존이라 별도 (병렬화 직후)
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
    <div className="relative min-h-screen print:min-h-0">
      {/* v2: 부팅 시퀀스 (세션당 1회) */}
      <BootSequence />
      {/* v2: 우상단 흐릿한 ambient 와이어프레임 (배경) */}
      <AmbientBackground />
      {/* v2: System Pulse sweep 라인 (TopBar ⊙ 버튼으로 트리거) */}
      <PulseSweep />
      <Sidebar role={userRole} bookmarks={bookmarks} />
      {/* v2: 사이드바 240px (md+) 또는 미노출 (sm), 헤더는 sticky */}
      <div className="relative z-[1] md:ml-60 print:ml-0">
        <DemoBanner
          userEmail={user?.email ?? null}
          demoEmail={process.env.DEMO_EMAIL ?? null}
        />
        <TopBar
          userEmail={user?.email ?? null}
          notifications={notifications}
          userRole={userRole}
        />
        <main className="min-h-[calc(100vh-4rem)] pb-24 md:pb-8 print:min-h-0 print:pb-0">
          <div className="mx-auto max-w-[1480px] px-4 py-9 sm:px-6 lg:px-8 print:max-w-none print:p-0">
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
