"use client";

import Link from "next/link";
import { CalendarCheck, Coins, Package, Info } from "lucide-react";
import type { NotificationItem } from "@/lib/notifications/server";
import { cn } from "@/lib/utils/cn";

type Props = {
  items: NotificationItem[];
  onNavigate: () => void;
};

const ICON: Record<NotificationItem["type"], typeof Info> = {
  closing: CalendarCheck,
  payroll: Coins,
  asset: Package,
  info: Info,
};

const SEVERITY: Record<NotificationItem["severity"], string> = {
  info: "text-tertiary",
  warn: "text-amber-300",
  danger: "text-error-soft",
};

export function NotificationsPanel({ items, onNavigate }: Props) {
  return (
    <div
      role="menu"
      aria-label="알림 목록"
      className="absolute right-0 top-full mt-2 w-[22rem] overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-container shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-outline-variant/30 px-4 py-3">
        <p className="text-body-md font-semibold text-on-surface">알림</p>
        <span className="text-label-sm text-on-surface-variant">
          {items.length}건
        </span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-on-surface-variant">
          새로운 알림이 없습니다.
        </div>
      ) : (
        <ul className="max-h-[60vh] divide-y divide-outline-variant/20 overflow-y-auto">
          {items.map((item) => {
            const Icon = ICON[item.type];
            return (
              <li key={item.id}>
                <Link
                  href={item.href as never}
                  onClick={onNavigate}
                  role="menuitem"
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-container-high"
                >
                  <Icon
                    aria-hidden
                    className={cn("mt-0.5 h-5 w-5 flex-shrink-0", SEVERITY[item.severity])}
                  />
                  <div className="flex-1">
                    <p className="text-body-md text-on-surface">{item.title}</p>
                    <p className="mt-0.5 text-label-sm text-on-surface-variant">
                      {item.description}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-outline-variant/30 bg-surface-container-low px-4 py-2 text-center">
        <Link
          href={"/closing" as never}
          onClick={onNavigate}
          className="text-label-sm font-semibold text-primary-electric hover:text-primary-container"
        >
          월말결산으로 이동 →
        </Link>
      </div>
    </div>
  );
}
