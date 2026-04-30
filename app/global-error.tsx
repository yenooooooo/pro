"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[global error]", error);
    }
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          minHeight: "100vh",
          background: "#0b1326",
          color: "#dae2fd",
          fontFamily: "Inter, system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#ffb4ab",
            }}
          >
            Critical Error
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 12 }}>
            앱이 응답할 수 없는 상태입니다
          </h1>
          <p style={{ marginTop: 12, color: "#c7c4d7" }}>
            네트워크 또는 서버에 일시적인 문제가 있을 수 있어요. 새로고침해 주세요.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "0.75rem 1.5rem",
              borderRadius: 8,
              background: "#c0c1ff",
              color: "#1000a9",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
