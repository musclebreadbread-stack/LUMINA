import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // 이 개발 환경은 Turbopack의 온디맨드 컴파일과 여러 워커의 동시 요청이 겹치면
  // 실제 결함이 아니라 리소스 경합만으로 타임아웃이 난다(같은 테스트를 혼자
  // 돌리면 통과한다) — 워커 수를 제한하고 콜드 컴파일 여유를 넉넉히 준다.
  workers: 4,
  timeout: 45_000,
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
  },
});
