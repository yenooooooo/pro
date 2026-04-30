import { Construction, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-stack-lg">
      <header className="space-y-2">
        <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
          <SettingsIcon aria-hidden className="h-4 w-4" />
          System
        </p>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          시스템 설정
        </h1>
        <p className="text-body-md text-on-surface-variant">
          요율·세액표 관리, 사용자·권한, 알림 설정, 백업/복원 등이 들어갈 영역입니다.
        </p>
      </header>

      <div className="glass-panel flex flex-col items-center gap-4 p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Construction aria-hidden className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-headline-md font-semibold text-on-surface">준비 중</p>
          <p className="max-w-md text-body-md text-on-surface-variant">
            v1.1에서 4대보험 요율·간이세액표·이메일 발송 설정이 추가됩니다. 그 전까지는
            관리자가 직접 Supabase에서 <code className="rounded bg-surface-container-high px-1.5 py-0.5 text-label-sm">insurance_rates</code> /{" "}
            <code className="rounded bg-surface-container-high px-1.5 py-0.5 text-label-sm">income_tax_table</code>을 수정합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
