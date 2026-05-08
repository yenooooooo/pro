"use client";

import { useState } from "react";
import {
  Sparkles,
  Upload,
  Loader2,
  Trash2,
  Plane,
  Hotel,
  Utensils,
  Package,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  addTripExpenseAction,
  deleteTripExpenseAction,
} from "../actions";
import { cn } from "@/lib/utils/cn";

type Category = "transport" | "lodging" | "meal" | "misc";

const CATEGORY_LABEL: Record<Category, string> = {
  transport: "교통",
  lodging: "숙박",
  meal: "식비",
  misc: "기타",
};

const CATEGORY_ICON: Record<Category, typeof Plane> = {
  transport: Plane,
  lodging: Hotel,
  meal: Utensils,
  misc: Package,
};

const CATEGORY_TONE: Record<Category, string> = {
  transport: "bg-tertiary/15 text-tertiary",
  lodging: "bg-amber-500/15 text-amber-300",
  meal: "bg-emerald-500/15 text-emerald-300",
  misc: "bg-surface-container-high text-on-surface-variant",
};

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  description: string | null;
  vendor: string | null;
  amount: number;
  vat: number;
  payment_method: string;
};

type Props = {
  tripId: string;
  expenses: Expense[];
  canEdit: boolean;
};

/**
 * 영수증 카테고리 자동 추론 (가맹점/설명 키워드 기반).
 * Gemini OCR 도 추정 가능하지만 fallback 보장.
 */
function inferCategory(merchant: string, description: string | null): Category {
  const text = `${merchant} ${description ?? ""}`.toLowerCase();
  if (/택시|taxi|지하철|버스|기차|ktx|항공|airline|항공편|렌터카|주차|톨/.test(text)) {
    return "transport";
  }
  if (/호텔|모텔|hotel|airbnb|숙박|게스트하우스|리조트|펜션/.test(text)) {
    return "lodging";
  }
  if (/식당|레스토랑|restaurant|커피|cafe|카페|음식점|편의점|gs25|cu|seven/.test(text)) {
    return "meal";
  }
  return "misc";
}

export function TripExpenseManager({ tripId, expenses, canEdit }: Props) {
  const router = useRouter();
  const [batchBusy, setBatchBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // 카테고리별 합계
  const totals = expenses.reduce(
    (acc, e) => {
      const cat = e.category as Category;
      acc[cat] = (acc[cat] ?? 0) + e.amount + e.vat;
      return acc;
    },
    {} as Record<Category, number>,
  );

  async function handleBatchUpload(files: FileList) {
    if (!files || files.length === 0) return;
    if (!canEdit) {
      setError("정산 완료된 출장은 수정할 수 없습니다.");
      return;
    }
    setError(null);
    setBatchBusy(true);
    setProgress({ done: 0, total: files.length });

    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/ai/ocr/receipt", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (json.ok && json.data) {
          const d = json.data;
          const date = d.date ?? new Date().toISOString().slice(0, 10);
          const merchant = d.vendor_name ?? "(미상)";
          const description = d.description ?? null;
          const category = inferCategory(merchant, description);
          const amount = typeof d.amount === "number" ? d.amount : 0;
          const vat = typeof d.vat === "number" ? d.vat : 0;

          const result = await addTripExpenseAction({
            trip_id: tripId,
            expense_date: date,
            category,
            description: description ?? `${merchant} 영수증`,
            vendor: merchant,
            amount,
            vat,
          });
          if (result.ok) successCount++;
        }
      } catch {
        /* skip 처리 */
      }
      setProgress({ done: i + 1, total: files.length });
    }

    setBatchBusy(false);
    if (successCount > 0) {
      router.refresh();
    } else {
      setError("OCR 결과가 모두 실패했습니다. GEMINI_API_KEY 확인 또는 직접 등록.");
    }
  }

  function deleteExpense(id: string) {
    if (!confirm("이 영수증을 삭제하시겠습니까?")) return;
    void (async () => {
      const result = await deleteTripExpenseAction(id, tripId);
      if (result.ok) router.refresh();
      else setError(result.error);
    })();
  }

  return (
    <div className="space-y-stack-md">
      {/* 영수증 일괄 업로드 */}
      {canEdit ? (
        <section className="glass-panel rounded-xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles aria-hidden className="h-4 w-4 text-primary-electric" />
            <h3 className="text-headline-md font-semibold text-on-surface">
              영수증 일괄 업로드
            </h3>
            <span className="rounded bg-primary-electric/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-electric">
              AI OCR
            </span>
          </div>
          <p className="mb-3 text-label-sm text-on-surface-variant">
            출장 중 받은 영수증 사진들을 한 번에 업로드. 각각 일자·금액·가맹점이
            자동 추출되고 카테고리(교통/숙박/식비/기타)가 자동 분류됩니다.
          </p>

          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-primary-electric/40 bg-surface-container-low px-4 py-2 text-body-md text-on-surface transition-colors hover:bg-surface-container-high">
            {batchBusy ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Upload aria-hidden className="h-4 w-4" />
            )}
            {batchBusy
              ? `처리 중 ${progress.done}/${progress.total}`
              : "영수증 사진 여러 장 선택"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              disabled={batchBusy}
              onChange={(e) => {
                if (e.target.files) {
                  void handleBatchUpload(e.target.files);
                }
                e.target.value = "";
              }}
            />
          </label>

          {error ? (
            <p className="mt-2 inline-flex items-center gap-1 text-label-sm text-error-soft">
              <AlertCircle aria-hidden className="h-4 w-4" />
              {error}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* 카테고리 합계 */}
      {expenses.length > 0 && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(["transport", "lodging", "meal", "misc"] as Category[]).map((cat) => {
            const Icon = CATEGORY_ICON[cat];
            const total = totals[cat] ?? 0;
            return (
              <div
                key={cat}
                className="glass-panel rounded-xl p-4"
              >
                <div className="mb-1 flex items-center gap-2">
                  <Icon aria-hidden className="h-4 w-4 text-on-surface-variant" />
                  <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">
                    {CATEGORY_LABEL[cat]}
                  </span>
                </div>
                <p className="text-data-tabular font-bold tabular-nums text-on-surface">
                  {total.toLocaleString("ko-KR")}원
                </p>
              </div>
            );
          })}
        </section>
      )}

      {/* 영수증 표 */}
      <section className="glass-panel overflow-hidden rounded-xl">
        <h3 className="border-b border-outline-variant/30 px-5 py-3 text-headline-md font-semibold text-on-surface">
          영수증 ({expenses.length}건)
        </h3>
        {expenses.length === 0 ? (
          <p className="p-12 text-center text-body-md text-on-surface-variant">
            등록된 영수증이 없습니다. 위에서 사진을 업로드하세요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-data-tabular">
              <thead>
                <tr className="border-b border-outline-variant/30 text-label-sm uppercase tracking-widest text-on-surface-variant">
                  <th className="px-4 py-3 text-left">일자</th>
                  <th className="px-4 py-3 text-left">분류</th>
                  <th className="px-4 py-3 text-left">가맹점</th>
                  <th className="px-4 py-3 text-left">설명</th>
                  <th className="px-4 py-3 text-right">금액</th>
                  <th className="px-4 py-3 text-right">VAT</th>
                  <th className="px-4 py-3 text-right">합계</th>
                  {canEdit ? <th className="px-4 py-3"></th> : null}
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => {
                  const cat = e.category as Category;
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-outline-variant/15 last:border-0 hover:bg-primary/5"
                    >
                      <td className="px-4 py-2 text-on-surface tabular-nums">
                        {e.expense_date}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            CATEGORY_TONE[cat],
                          )}
                        >
                          {CATEGORY_LABEL[cat]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-on-surface">{e.vendor ?? "—"}</td>
                      <td className="px-4 py-2 text-on-surface-variant">
                        {e.description ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-on-surface-variant">
                        {e.amount.toLocaleString("ko-KR")}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-on-surface-variant">
                        {e.vat.toLocaleString("ko-KR")}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold text-on-surface">
                        {(e.amount + e.vat).toLocaleString("ko-KR")}
                      </td>
                      {canEdit ? (
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => deleteExpense(e.id)}
                            aria-label="삭제"
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-on-surface-variant hover:bg-error-soft/10 hover:text-error-soft"
                          >
                            <Trash2 aria-hidden className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
