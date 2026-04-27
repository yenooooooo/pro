"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-high px-4 py-2 text-label-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-highest"
    >
      <Printer aria-hidden className="h-4 w-4" />
      인쇄 / PDF
    </button>
  );
}
