import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-panel w-full max-w-md p-8">
        <h1 className="text-headline-lg font-semibold text-on-surface">로그인</h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Phase 2에서 Supabase Auth 연결 예정.
        </p>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-label-sm uppercase tracking-widest text-on-surface-variant">
              이메일
            </label>
            <input
              type="email"
              inputMode="email"
              disabled
              className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant disabled:opacity-60"
              placeholder="admin@company.com"
            />
          </div>
          <div>
            <label className="text-label-sm uppercase tracking-widest text-on-surface-variant">
              비밀번호
            </label>
            <input
              type="password"
              disabled
              className="mt-2 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface disabled:opacity-60"
              placeholder="••••••••"
            />
          </div>
          <button
            disabled
            className="min-h-11 w-full rounded-lg bg-gradient-to-b from-primary-electric to-primary-container text-data-tabular font-semibold text-on-primary opacity-60"
          >
            Phase 2에서 활성화
          </button>
        </div>
        <Link
          href="/"
          className="mt-6 block text-center text-label-sm uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
        >
          ← 랜딩으로
        </Link>
      </div>
    </main>
  );
}
