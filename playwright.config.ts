import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // 이 개발 환경은 Turbopack의 온디맨드 컴파일과 여러 워커의 동시 요청이 겹치면
  // 실제 결함이 아니라 리소스 경합만으로 타임아웃이 난다(같은 테스트를 혼자
  // 돌리면 통과한다) — 워커 수를 제한하고 콜드 컴파일 여유를 넉넉히 준다.
  workers: 4,
  timeout: 45_000,
  // 2코어 CI에서는 배경 3D 장면이 CPU를 나눠 쓰므로 클릭 뒤 화면 전환이 기본 5초를 넘기기도 한다.
  expect: { timeout: 10_000 },
  retries: 1,
  reporter: [['list'], ['json', { outputFile: 'playwright-report/results.json' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
    // 개인 결과(사주·궁합) 세션은 사이트 origin과 암호화 키가 없으면 의도적으로 503으로 닫힌다.
    // CI에는 .env가 없으므로 e2e 서버에만 테스트 전용 값을 준다. 아래 키는 비밀이 아니며
    // 운영·스테이징 값과 무관하다.
    env: {
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
      APP_ENV: 'development',
      REPORT_SESSION_ENCRYPTION_KEY: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
    },
  },
});
