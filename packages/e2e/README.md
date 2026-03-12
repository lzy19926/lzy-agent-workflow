# VideoMemo E2E 测试

基于 Playwright 的端到端测试套件，用于 VideoMemo 前端应用的质量保证。

## 目录结构

```
packages/e2e/
├── fixtures/           # 测试 fixtures 和页面对象模型
│   ├── index.ts        # 主要 fixtures 和 POM 类
│   └── auth.ts         # 认证相关 fixtures
├── tests/              # 测试用例文件
│   ├── navigation.test.ts      # 导航和布局测试
│   ├── homepage.test.ts        # 首页测试
│   ├── settings.test.ts        # 设置页面测试
│   ├── analysis-page.test.ts   # 代码分析页面测试
│   ├── history-pages.test.ts   # 历史记录页面测试
│   ├── task-detail.test.ts     # 任务详情页测试
│   └── user-flow.test.ts       # 完整用户流程测试
├── utils/              # 测试工具函数
│   └── test-helpers.ts
├── playwright.config.ts # Playwright 配置
├── package.json        # 项目配置
└── tsconfig.json       # TypeScript 配置
```

## 快速开始

### 1. 安装依赖

```bash
cd packages/e2e
pnpm install
```

### 2. 安装浏览器

```bash
pnpm install:browser
```

这将安装 Chromium、Firefox 和 WebKit 浏览器。

### 3. 启动开发服务器

在运行测试之前，确保前端开发服务器正在运行：

```bash
cd ../frontend
pnpm dev
```

### 4. 运行测试

```bash
# 运行所有测试
pnpm test

# 在 UI 模式下运行（推荐用于调试）
pnpm test:ui

# 以调试模式运行
pnpm test:debug

# 在有头模式下运行（显示浏览器）
pnpm test:headed

# 只运行 Chromium 测试
pnpm test:chromium

# 只运行 Firefox 测试
pnpm test:firefox

# 只运行 WebKit 测试
pnpm test:webkit

# 运行移动端测试
pnpm test:mobile

# 运行所有浏览器测试
pnpm test:all

# CI 模式运行
pnpm test:ci
```

### 5. 查看测试报告

```bash
pnpm test:report
```

## 测试用例概览

### 导航和布局测试 (`navigation.test.ts`)
- 主导航菜单显示
- 路由跳转
- 菜单项高亮
- 响应式布局
- 浏览器历史导航

### 首页测试 (`homepage.test.ts`)
- URL 输入验证
- 表单验证
- 任务创建流程
- 错误处理

### 设置页面测试 (`settings.test.ts`)
- API Key 配置
- 输出目录配置
- 表单提交
- 配置持久化

### 代码分析页面测试 (`analysis-page.test.ts`)
- 项目路径输入
- 项目验证
- 步骤选择
- 分析流程
- 进度展示

### 历史记录页面测试 (`history-pages.test.ts`)
- 视频历史记录
- 分析历史记录
- 列表展示
- 查看/删除操作
- 分页功能
- SSE 实时更新

### 任务详情页测试 (`task-detail.test.ts`)
- 任务信息展示
- 进度条
- 结果展示
- 标签页切换
- 复制功能

### 用户流程测试 (`user-flow.test.ts`)
- 完整视频解析流程
- 完整配置流程
- 完整代码分析流程
- 跨浏览器兼容性
- 可访问性测试

## 编写测试

### 基本结构

```typescript
import { test, expect } from '../fixtures';

test.describe('功能模块', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前的设置
    await page.goto('/path');
  });

  test('应该做某事', async ({ page }) => {
    // 测试逻辑
    await expect(page.getByRole('button')).toBeVisible();
  });
});
```

### 使用页面对象模型

```typescript
import { test, expect } from '../fixtures';

test('使用 POM 测试', async ({ page, pages }) => {
  // 使用预定义的页面对象
  await pages.HomePage.goto();
  await pages.HomePage.enterVideoUrl('https://example.com');
  await pages.HomePage.submit();

  // 验证
  await expect(page).toHaveURL(/\/task\/.+/);
});
```

### 使用测试工具函数

```typescript
import { test, expect } from '../fixtures';
import { waitForToast, confirmDelete } from '../utils/test-helpers';

test('使用工具函数', async ({ page }) => {
  await page.goto('/settings');

  // 填写并保存
  await page.getByLabel(/API Key/i).fill('sk-test');
  await page.getByRole('button', { name: /保存/i }).click();

  // 等待 toast 提示
  await waitForToast(page, /配置已保存/i);
});
```

## 配置选项

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `BASE_URL` | 应用基础 URL | http://localhost:5173 |
| `CI` | CI 环境标志 | - |

### 浏览器配置

测试支持以下浏览器：
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

## 最佳实践

1. **使用数据属性定位元素**: 为动态内容添加 `data-testid` 属性
2. **等待网络空闲**: 使用 `page.waitForLoadState('networkidle')`
3. **使用有意义的选择器**: 优先使用 `getByRole`, `getByText`, `getByLabel`
4. **测试用户流程**: 模拟真实用户操作路径
5. **隔离测试**: 每个测试应该是独立的
6. **清理状态**: 测试后清理 IndexedDB 和 LocalStorage

## 故障排查

### 测试失败

1. 查看测试报告中的截图
2. 使用 `--debug` 模式逐步调试
3. 检查控制台错误信息

### 元素未找到

1. 确认页面已完全加载
2. 检查元素定位器是否正确
3. 使用 `waitForTimeout` 添加适当等待

### 超时问题

增加超时时间：
```typescript
test.setTimeout(60000); // 单个测试超时
```

或在配置文件中调整：
```typescript
export default defineConfig({
  timeout: 60 * 1000,
});
```

## CI/CD 集成

### GitHub Actions 示例

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: pnpm install
      - run: pnpm install:browser
        working-directory: packages/e2e
      - run: pnpm test
        working-directory: packages/e2e
```

## 许可证

MIT
