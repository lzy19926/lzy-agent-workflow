import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 * 用于 VideoMemo 前端应用的端到端测试
 */
export default defineConfig({
  // 测试用例超时时间
  timeout: 60 * 1000,

  // 单个断言超时时间
  expect: {
    timeout: 5000,
  },

  // 测试失败重试次数
  retries: process.env.CI ? 2 : 0,

  // 并行工作进程数
  workers: process.env.CI ? 1 : 3,

  // 测试报告配置
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/junit.xml' }],
  ],

  // 共享配置
  use: {
    // 浏览器基础 URL
    baseURL: process.env.BASE_URL || 'http://localhost:5176',

    // 收集跟踪信息
    trace: 'on-first-retry',

    // 收集截图
    screenshot: 'only-on-failure',

    // 收集视频
    video: 'retain-on-failure',

    // 浏览器上下文选项
    viewport: { width: 1440, height: 900 },

    // 权限
    permissions: ['clipboard-read', 'clipboard-write'],
  },

  // 多浏览器配置
  projects: [
    // 桌面浏览器
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // 移动浏览器
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // 有登录状态的浏览器
    {
      name: 'chromium-authed',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['chromium'],
    },
  ],

  // 启动应用配置
  webServer: {
    command: 'cd ../ && pnpm dev:frontend',
    url: 'http://localhost:5176',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
