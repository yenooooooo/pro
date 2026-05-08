import Link from "next/link";
import { ArrowLeft, Database, Download, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default function BackupPage() {
  return (
    <div className="space-y-stack-lg">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        시스템 설정
      </Link>

      <header className="space-y-2">
        <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
          <Database aria-hidden className="h-4 w-4" />
          Backup & Restore
        </p>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          데이터 백업
        </h1>
        <p className="text-body-md text-on-surface-variant">
          전체 데이터의 JSON 백업을 다운로드 받거나 Supabase 정책에 따른 자동 백업을 활용하세요.
        </p>
      </header>

      {/* JSON Export */}
      <section className="glass-panel rounded-xl p-6">
        <h2 className="mb-3 text-headline-md font-semibold text-on-surface">
          전체 데이터 JSON 내보내기
        </h2>
        <p className="mb-4 text-body-md text-on-surface-variant">
          모든 ERP 도메인 데이터 (직원·근태·급여·지출·자산·거래처·결재·결산) 를 단일 JSON 파일로 다운로드.
          다른 환경으로 마이그레이션하거나 외부 분석 도구에 사용 가능.
        </p>
        <a
          href="/api/backup/json"
          download
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-5 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          <Download aria-hidden className="h-4 w-4" />
          전체 백업 다운로드
        </a>
      </section>

      {/* Supabase 자동 백업 안내 */}
      <section className="glass-panel rounded-xl p-6 space-y-3">
        <h2 className="text-headline-md font-semibold text-on-surface">
          Supabase 자동 백업
        </h2>
        <p className="text-body-md text-on-surface-variant">
          Supabase Pro/Team 플랜은 자동 백업을 제공합니다.
        </p>
        <ul className="space-y-1 text-label-sm text-on-surface-variant">
          <li>
            <strong className="text-on-surface">Daily Backup</strong> — 매일 자정 자동 백업, 7일 보존 (Pro)
          </li>
          <li>
            <strong className="text-on-surface">PITR (Point-In-Time Recovery)</strong> — 1초 단위 복구 (Pro $25/월)
          </li>
          <li>
            <strong className="text-on-surface">pg_dump</strong> — 수동 dump (Free 포함)
          </li>
        </ul>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-label-sm font-semibold text-primary-electric hover:text-primary-container"
        >
          Supabase Dashboard 열기 →
        </a>
      </section>

      {/* 복원 안내 */}
      <section className="glass-panel rounded-xl p-6 space-y-3">
        <header className="flex items-center gap-2">
          <AlertTriangle aria-hidden className="h-5 w-5 text-amber-300" />
          <h2 className="text-headline-md font-semibold text-on-surface">
            복원 가이드
          </h2>
        </header>
        <p className="text-body-md text-on-surface-variant">
          데이터 손실 시 복원은 다음 우선순위로 시도하세요:
        </p>
        <ol className="ml-4 list-decimal space-y-2 text-body-md text-on-surface-variant">
          <li>
            <strong className="text-on-surface">Supabase 자동 백업</strong> — Dashboard → Settings → Database → Backups 에서 시점 선택 후 Restore
          </li>
          <li>
            <strong className="text-on-surface">JSON 복원 (소규모)</strong> — 위에서 다운로드받은 백업을 SQL Editor 에서 INSERT 로 적용 (테이블별 수동)
          </li>
          <li>
            <strong className="text-on-surface">pg_dump 복원 (전체)</strong> — psql -f backup.sql DATABASE_URL
          </li>
        </ol>
        <p className="text-label-sm text-error-soft">
          ⚠ 복원은 기존 데이터를 덮어씁니다. 운영 중인 환경에서는 staging DB 에서 먼저 검증 권장.
        </p>
      </section>
    </div>
  );
}
