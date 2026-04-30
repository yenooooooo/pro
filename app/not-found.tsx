import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Compass aria-hidden className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-2">
        <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">404</p>
        <h1 className="text-headline-lg text-on-surface">페이지를 찾을 수 없어요</h1>
        <p className="max-w-md text-body-md text-on-surface-variant">
          주소가 변경되었거나 삭제된 페이지일 수 있어요.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-body-md font-semibold text-on-primary transition-all duration-200 hover:opacity-90"
      >
        대시보드로 이동
      </Link>
    </div>
  );
}
