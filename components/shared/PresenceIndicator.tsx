"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users } from "lucide-react";

type Peer = {
  ref: string;
  email: string;
  joinedAt: number;
};

type Props = {
  userEmail: string | null;
  /** 사용자가 보고 있는 페이지 경로 — channel 이름에 포함 */
  page: string;
};

/**
 * Supabase Realtime presence 로 같은 페이지에 접속한 사용자 아바타 표시.
 *
 * - channel 이름: presence:{page} (페이지마다 별도 채널)
 * - 본인 포함 모든 peer 표시 (다른 탭으로 열어 시연 가능)
 * - 1명만 있으면 숨김 (혼자일 땐 노이즈)
 */
export function PresenceIndicator({ userEmail, page }: Props) {
  const [peers, setPeers] = useState<Peer[]>([]);

  useEffect(() => {
    if (!userEmail) return;
    const supabase = createClient();
    const channel = supabase.channel(`presence:${page}`, {
      config: { presence: { key: userEmail } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Peer>();
        const all: Peer[] = [];
        for (const refs of Object.values(state)) {
          for (const r of refs) all.push(r);
        }
        setPeers(all);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            ref: crypto.randomUUID(),
            email: userEmail,
            joinedAt: Date.now(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [page, userEmail]);

  if (peers.length <= 1) return null;

  return (
    <div
      className="hidden items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 md:inline-flex"
      title={`이 페이지를 보고 있는 사용자 ${peers.length}명`}
    >
      <Users aria-hidden className="h-3.5 w-3.5 text-emerald-300" />
      <span className="text-label-sm font-semibold tabular-nums text-emerald-300">
        {peers.length}
      </span>
      <div className="ml-1 flex -space-x-1.5">
        {peers.slice(0, 4).map((p) => (
          <span
            key={p.ref}
            title={p.email}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-surface-container bg-gradient-to-br from-primary-electric/40 to-primary-container/40 text-[10px] font-bold text-on-surface"
          >
            {p.email.slice(0, 1).toUpperCase()}
          </span>
        ))}
        {peers.length > 4 ? (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-surface-container bg-surface-container-high text-[10px] font-bold text-on-surface-variant">
            +{peers.length - 4}
          </span>
        ) : null}
      </div>
    </div>
  );
}
