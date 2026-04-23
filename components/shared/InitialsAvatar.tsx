import { cn } from "@/lib/utils/cn";

type Size = "sm" | "md" | "lg";
type Tone = "primary" | "secondary" | "error";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

const TONE_CLASS: Record<Tone, string> = {
  primary: "text-primary-electric",
  secondary: "text-secondary-slate",
  error: "text-error-soft",
};

type Props = {
  name: string;
  size?: Size;
  tone?: Tone;
  className?: string;
};

/**
 * 이니셜 원형 아바타.
 * - 한글 이름: 앞 두 글자(예: "김영호" → "김영")
 * - 영문 이름: 각 단어 첫 글자(예: "Adrian Sterling" → "AS")
 */
export function InitialsAvatar({ name, size = "sm", tone = "primary", className }: Props) {
  const initials = getInitials(name);
  return (
    <div
      aria-hidden
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-full border border-outline-variant/20 bg-surface-container-high font-bold",
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
    >
      {initials}
    </div>
  );
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // 한글: 첫 두 글자
  if (/[가-힣]/.test(trimmed)) {
    return trimmed.slice(0, 2);
  }
  // 영문: 각 단어 첫 글자 최대 2개
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
