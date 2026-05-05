import "server-only";

/**
 * 이메일 HTML 템플릿 — 한국어 + 다크 테마.
 * 인라인 스타일 (이메일 클라이언트 호환성).
 */

const BRAND_COLOR = "#c0c1ff";
const BG_COLOR = "#0b1326";
const PANEL_COLOR = "#171f33";
const TEXT_COLOR = "#dae2fd";
const MUTED_COLOR = "#c7c4d7";

function wrapEmail(args: { title: string; bodyHtml: string; cta?: { label: string; url: string } }): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(args.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${TEXT_COLOR};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BG_COLOR};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;background:${PANEL_COLOR};border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <tr><td style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="display:inline-block;font-weight:700;letter-spacing:.05em;color:${BRAND_COLOR};text-transform:uppercase;font-size:11px;">Nexus ERP</span>
          <span style="float:right;color:${MUTED_COLOR};font-size:11px;">Enterprise Edition</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 14px;font-size:22px;color:${TEXT_COLOR};font-weight:600;letter-spacing:-0.01em;">${escapeHtml(args.title)}</h1>
          <div style="font-size:15px;line-height:1.6;color:${MUTED_COLOR};">${args.bodyHtml}</div>
          ${args.cta ? `
            <p style="margin:28px 0 0;">
              <a href="${escapeAttr(args.cta.url)}" style="display:inline-block;background:linear-gradient(180deg,${BRAND_COLOR},#8083ff);color:#1000a9;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${escapeHtml(args.cta.label)}</a>
            </p>` : ''}
        </td></tr>
        <tr><td style="padding:18px 28px;background:rgba(0,0,0,0.2);border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:${MUTED_COLOR};">
          본 메일은 Nexus ERP 시스템에서 자동 발송되었습니다. 회신하지 마세요.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function approvalRequestedEmail(args: {
  recipientEmail: string;
  approverRole: string | null;
  requesterEmail: string;
  kind: string;
  title: string;
  amount: number | null;
  approvalUrl: string;
}): { subject: string; html: string; text: string } {
  const KIND_LABEL: Record<string, string> = {
    expense: "지출",
    purchase: "구매",
    business_trip: "출장",
    general: "일반",
  };
  const kindKr = KIND_LABEL[args.kind] ?? args.kind;
  const subject = `[Nexus ERP] ${kindKr} 결재 요청: ${args.title}`;
  const amountLine = args.amount
    ? `<p><strong style="color:${BRAND_COLOR};">${args.amount.toLocaleString("ko-KR")}원</strong> 규모 ${kindKr} 결재 요청입니다.</p>`
    : `<p>${kindKr} 결재 요청입니다.</p>`;
  const html = wrapEmail({
    title: `${kindKr} 결재 요청`,
    bodyHtml: `
      <p>${escapeHtml(args.requesterEmail)} 님이 발의한 결재 건이 ${args.approverRole ? `<strong>${escapeHtml(args.approverRole)}</strong> ` : ""}결재 단계로 도착했습니다.</p>
      <div style="background:rgba(192,193,255,0.06);border-left:3px solid ${BRAND_COLOR};padding:12px 14px;margin:14px 0;border-radius:0 6px 6px 0;">
        <p style="margin:0 0 4px;font-weight:600;color:${TEXT_COLOR};">${escapeHtml(args.title)}</p>
        ${amountLine}
      </div>
      <p>아래 버튼을 눌러 검토 후 승인 또는 반려하세요.</p>`,
    cta: { label: "결재 처리하기 →", url: args.approvalUrl },
  });
  const text = `[Nexus ERP] ${kindKr} 결재 요청: ${args.title}\n\n${args.requesterEmail} 님의 결재 요청\n금액: ${args.amount ? args.amount.toLocaleString("ko-KR") + "원" : "—"}\n\n결재 처리: ${args.approvalUrl}`;
  return { subject, html, text };
}

export function approvalDecidedEmail(args: {
  recipientEmail: string;
  decision: "approved" | "rejected";
  approverEmail: string;
  title: string;
  approvalUrl: string;
  comment?: string | null;
}): { subject: string; html: string; text: string } {
  const isApproved = args.decision === "approved";
  const verb = isApproved ? "승인" : "반려";
  const subject = `[Nexus ERP] 결재 ${verb}: ${args.title}`;
  const html = wrapEmail({
    title: `결재 ${verb} 알림`,
    bodyHtml: `
      <p><strong>${escapeHtml(args.title)}</strong> 건이 ${escapeHtml(args.approverEmail)} 님에 의해 <strong style="color:${isApproved ? "#86efac" : "#fca5a5"};">${verb}</strong>되었습니다.</p>
      ${args.comment ? `
        <div style="background:rgba(255,255,255,0.04);padding:10px 12px;margin:12px 0;border-radius:6px;font-size:14px;color:${MUTED_COLOR};">
          💬 ${escapeHtml(args.comment)}
        </div>` : ""}
      <p>상세 내역은 시스템에서 확인하세요.</p>`,
    cta: { label: "상세 보기 →", url: args.approvalUrl },
  });
  const text = `[Nexus ERP] 결재 ${verb}: ${args.title}\n\n${args.approverEmail} 님이 ${verb}하셨습니다.\n${args.comment ? "의견: " + args.comment + "\n" : ""}\n상세: ${args.approvalUrl}`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}
