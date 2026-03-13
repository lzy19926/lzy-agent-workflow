import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 * 用于 VideoMemo 前端应用的端到端测试
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // =========================================================================
  // 全局超时配置
  // =========================================================================

  // 单个测试用例的超时时间（毫秒），默认 30 秒
  // 超过此时间测试将被强制终止并标记为失败
  timeout: 60 * 1000,

  // 单个断言（expect）的超时时间（毫秒）
  // 例如：expect(element).toBeVisible() 最多等待 5 秒
  expect: {
    timeout: 5000,
  },

  // =========================================================================
  // 重试与并行配置
  // =========================================================================

  // 测试失败后的重试次数
  // CI 环境下重试 2 次（应对偶发失败），本地开发不重试
  retries: process.env.CI ? 2 : 0,

  // 并行工作进程数量
  // CI 环境下使用 1 个进程保证稳定性，本地使用 3 个进程加速测试
  workers: process.env.CI ? 1 : 3,

  // =========================================================================
  // 测试报告配置
  // =========================================================================

  // 测试报告生成器配置
  // 支持多种格式：HTML（可视化）、JSON（机器可读）、JUnit（CI 集成）
  reporter: [
    // HTML 报告 - 可在浏览器中查看详细的测试结果和截图
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    // JSON 报告 - 用于自定义数据处理和分析
    ['json', { outputFile: 'playwright-report/results.json' }],
    // JUnit 报告 - 用于 CI/CD 流水线集成（如 Jenkins、GitHub Actions）
    ['junit', { outputFile: 'playwright-report/junit.xml' }],
  ],

  // =========================================================================
  // 浏览器上下文共享配置
  // 以下配置将应用于所有测试项目
  // =========================================================================
  use: {
    // 测试应用的基础 URL
    // 所有 page.goto() 的相对路径都将基于此 URL
    // 可通过环境变量 BASE_URL 覆盖，默认为 http://localhost:5176
    baseURL: process.env.BASE_URL || 'http://localhost:5176',

    // Playwright Trace 追踪配置
    // 'on-first-retry' 表示仅在第一次重试时收集追踪信息
    // 追踪信息包含操作快照、网络请求、控制台日志等，用于调试
    trace: 'on-first-retry',

    // 截图配置
    // 'only-on-failure' 表示仅在测试失败时自动截图
    // 其他选项：'on'（始终截图）、'off'（不截图）
    screenshot: 'only-on-failure',

    // 视频录制配置
    // 'retain-on-failure' 表示仅在测试失败时保留视频
    // 其他选项：'on'、'off'、'retain-on-first-retry'
    video: 'retain-on-failure',

    // 浏览器视口大小（宽 x 高）
    // 模拟桌面显示器分辨率，可根据需要调整
    viewport: { width: 1440, height: 900 },

    // 浏览器权限配置
    // 允许测试访问剪贴板（用于复制/粘贴功能测试）
    permissions: ['clipboard-read', 'clipboard-write'],
  },

  // =========================================================================
  // 多浏览器/多项目配置
  // 可以定义多个项目，在不同浏览器环境下运行相同的测试
  // =========================================================================
  projects: [
    // -----------------------------------------------------------------------
    // 桌面浏览器配置
    // -----------------------------------------------------------------------

    // Chromium - Google Chrome / Microsoft Edge 使用的内核
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Firefox - Mozilla Firefox 浏览器
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    // WebKit - Apple Safari 浏览器内核
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // -----------------------------------------------------------------------
    // 移动浏览器配置
    // 模拟移动设备视口和用户代理
    // -----------------------------------------------------------------------

    // Mobile Chrome - 模拟 Google Pixel 5 手机
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    // Mobile Safari - 模拟 iPhone 12 手机
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // -----------------------------------------------------------------------
    // 认证状态配置
    // 用于测试需要登录的场景
    // -----------------------------------------------------------------------

    // 已认证的 Chromium 浏览器
    // 使用 storageState 加载预保存的登录状态（cookies、localStorage）
    // dependencies 指定必须先成功运行 'chromium' 项目来完成登录
    {
      name: 'chromium-authed',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['chromium'],
    },
  ],

  // =========================================================================
  // 开发服务器配置
  // Playwright 将自动启动此配置的应用服务器进行测试
  // =========================================================================
  webServer: {
    // 启动开发服务器的命令
    // 在项目根目录下执行 pnpm dev:frontend
    command: 'cd ../ && pnpm dev:frontend',

    // 服务器启动后监听的 URL
    // Playwright 会等待此 URL 可访问后再开始测试
    url: 'http://localhost:5176',

    // 是否重用已存在的服务器
    // 非 CI 环境下，如果端口 5176 已有服务运行，则直接使用
    // CI 环境下总是启动新服务器
    reuseExistingServer: !process.env.CI,

    // 等待服务器启动的超时时间（毫秒）
    // 如果超过 2 分钟服务器仍未就绪，测试将失败
    timeout: 120 * 1000,
  },
});
