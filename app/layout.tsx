import type { Metadata, Viewport } from "next";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from "next-intl";
import { PWARegister } from "@/components/shared/PWARegister";
import { getLocale } from "@/i18n/get-locale";
import { getMessages } from "@/i18n/get-messages";
import "./globals.css";

// v2 디자인 — Editorial / 금융지 스타일
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});
// Pretendard 는 globals.css 에서 CDN 임포트 (next/font 미지원)

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
  themeColor: "#08090B",
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
    <html
      lang={locale}
      className={`dark ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Pretendard Variable — Korean sans serif */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
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
          <Toaster
            position="bottom-center"
            theme="dark"
            toastOptions={{
              style: {
                background: "#0E1014",
                border: "1px solid #C99A4A",
                borderRadius: "0",
                fontFamily: "JetBrains Mono, ui-monospace, monospace",
                fontSize: "11px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#EDEEF0",
                boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
