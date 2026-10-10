const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/*
 * 통합 테스트 DB URL. 로컬 일회용 DB만 허용해 운영·staging Neon에 쓰기가 일어나지 않게 한다.
 * 값이 없으면 null을 돌려주고 테스트는 건너뛴다.
 */
export function localIntegrationDatabaseUrl(): string | null {
  const value = process.env.LUMINA_IT_DATABASE_URL?.trim();
  if (!value) {
    // CI는 LUMINA_IT_REQUIRED=1로 실행해 DB 설정 누락이 조용한 skip으로 통과하지 않게 한다.
    if (process.env.LUMINA_IT_REQUIRED === "1") throw new Error("LUMINA_IT_DATABASE_URL is required for integration tests");
    return null;
  }
  const url = new URL(value);
  if ((url.protocol !== "postgres:" && url.protocol !== "postgresql:") || !LOCAL_HOSTS.has(url.hostname)) {
    throw new Error("LUMINA_IT_DATABASE_URL must point to a local disposable PostgreSQL instance");
  }
  return value;
}
