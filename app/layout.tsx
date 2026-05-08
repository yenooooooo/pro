import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from "next-intl";
import { PWARegister } from "@/components/shared/PWARegister";
import { getLocale } from "@/i18n/get-locale";
import { getMessages } from "@/i18n/get-messages";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nexus ERP — 중소기업 총무 통합 플랫폼",
    template: "%s · Nexus ERP",
  },
  description:
    "중소기업 총무 담당자를 위한 월간 반복 업무 통합 웹앱. 직원·근태·급여·연차·지출·자산·월말결산을 하나로.",
  keywords: ["Nexus ERP", "총무", "ERP", "중소기업", "급여계산", "연차", "근태", "월말결산"],
  authors: [{ name: "Nexus ERP" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nexus ERP",
  },
  openGraph: {
    title: "Nexus ERP — 중소기업 총무 통합 플랫폼",
    description: "엑셀 10개 대신 웹앱 1개. 총무 업무의 완성형 미니 ERP.",
    locale: "ko_KR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b1326",
};

// cookies() 를 통해 locale 결정 → 모든 route dynamic 강제
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // i18n: messages 로드 실패 시 fallback (빈 객체) — 페이지 다운 방지
  let locale: "ko" | "en" = "ko";
  let messages: Record<string, unknown> = {};
  try {
    locale = getLocale();
    messages = (await getMessages(locale)) as Record<string, unknown>;
  } catch (err) {
    console.error("[i18n] failed to load:", err);
  }
  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        {/* 이전 ThemeToggle 사용자의 localStorage 잔여 라이트 모드 클래스 즉시 제거 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{
              localStorage.removeItem('theme-mode');
              document.documentElement.classList.remove('light');
              document.documentElement.classList.add('dark');
            }catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <PWARegister />
          <Toaster position="top-right" richColors theme="dark" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
