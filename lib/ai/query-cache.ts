import "server-only";

/**
 * Ask Nexus 응답 인메모리 LRU 캐시.
 *
 * 같은 사용자 + 같은 질문 → 5분 캐시. Gemini 호출 0회로 즉시 응답.
 * 워커 재시작 시 사라짐 (Vercel serverless 특성). 영구 캐시는 v2.
 */

const TTL_MS = 5 * 60 * 1000; // 5분
const MAX_ENTRIES = 100;

type CachedAnswer = {
  answer: string;
  query: { table: string; description: string } | null;
  rows: Record<string, unknown>[] | null;
  source: "gemini";
  expiresAt: number;
};

const cache = new Map<string, CachedAnswer>();

export function makeCacheKey(userId: string, query: string): string {
  // 공백·대소문자 정규화
  const normalized = query.trim().replace(/\s+/g, " ").toLowerCase();
  return `${userId}::${normalized}`;
}

export function getCached(key: string): CachedAnswer | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry;
}

export function setCached(
  key: string,
  value: Omit<CachedAnswer, "expiresAt">,
): void {
  // LRU eviction
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { ...value, expiresAt: Date.now() + TTL_MS });
}
