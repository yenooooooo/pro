"use client";

import { usePathname } from "next/navigation";
import { PresenceIndicator } from "./PresenceIndicator";

type Props = {
  userEmail: string | null;
};

/**
 * client 측에서 pathname 을 가져와 PresenceIndicator 에 전달.
 * 서버 layout 이 pathname 을 못 읽기 때문에 별도 client wrapper.
 */
export function PresenceMount({ userEmail }: Props) {
  const pathname = usePathname();
  // /employees/abc-123 같은 dynamic 경로는 한 그룹으로 묶어 노이즈 줄임
  const page = pathname.split("/").slice(0, 3).join("/") || "/";
  return <PresenceIndicator userEmail={userEmail} page={page} />;
}
