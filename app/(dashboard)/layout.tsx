import type { ReactNode } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopBar } from "@/components/shared/TopBar";
import { BottomTabBar } from "@/components/shared/BottomTabBar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <TopBar />
      <main className="pb-24 pl-0 pt-4 md:pb-8 md:pl-16 lg:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-container-padding">
          {children}
        </div>
      </main>
      <BottomTabBar />
    </div>
  );
}
