import { existsSync } from 'node:fs'

import { defineConfig, devices } from '@playwright/test'

const port = 3137
const aiMockPort = 41234
const baseURL = `http://localhost:${port}`
const chromeExecutablePath = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find((path) => existsSync(path))

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromeExecutablePath ? { executablePath: chromeExecutablePath } : undefined,
      },
    },
  ],
  webServer: [
    {
      command: `pnpm exec aimock --config aimock.config.json --host 127.0.0.1 --port ${aiMockPort}`,
      cwd: import.meta.dirname,
      url: `http://127.0.0.1:${aiMockPort}/v1/models`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `CLOUDFLARE_ENV=test pnpm exec dotenvx run -f .env.test -- vite --host localhost --port ${port} --strictPort`,
      cwd: import.meta.dirname,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 90_000,
    },
  ],
})
