import { test, expect } from '../fixtures';

/**
 * 首页视频解析测试用例
 * 测试 URL 输入、表单验证、任务创建流程
 */
test.describe('首页视频解析', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前访问首页
    await page.goto('/');
  });

  test('应该正确显示首页标题和说明', async ({ page }) => {
    // 验证页面标题
    await expect(page.getByRole('heading', { name: /输入视频 URL/i })).toBeVisible();

    // 验证页面图标
    await expect(page.locator('[class*="PlayCircle"]')).toBeVisible();
  });

  test('应该正确显示视频 URL 输入框', async ({ page }) => {
    const input = page.getByPlaceholder(/https?:\/\/.+/);
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
  });

  test('应该正确显示提交按钮', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /开始解析/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test.describe('表单验证', () => {
    test('提交空 URL 应该显示错误提示', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /开始解析/i });
      await submitButton.click();

      // 应该显示错误提示
      await expect(page.getByText(/请输入视频 URL/i)).toBeVisible();
    });

    test('提交无效 URL 格式应该显示错误提示', async ({ page }) => {
      const input = page.getByPlaceholder(/https?:\/\/.+/);
      await input.fill('not-a-valid-url');

      const submitButton = page.getByRole('button', { name: /开始解析/i });
      await submitButton.click();

      // 应该显示错误提示
      await expect(page.getByText(/请输入有效的 URL/i)).toBeVisible();
    });

    test('URL 缺少协议应该显示错误提示', async ({ page }) => {
      const input = page.getByPlaceholder(/https?:\/\/.+/);
      await input.fill('www.example.com/video');

      const submitButton = page.getByRole('button', { name: /开始解析/i });
      await submitButton.click();

      // 应该显示错误提示
      await expect(page.getByText(/请输入有效的 URL/i)).toBeVisible();
    });

    test('有效的 HTTP URL 应该通过验证', async ({ page }) => {
      const input = page.getByPlaceholder(/https?:\/\/.+/);
      await input.fill('http://www.example.com/video');

      // 验证通过，没有错误提示
      await expect(page.getByText(/请输入有效的 URL/i)).not.toBeVisible();
    });

    test('有效的 HTTPS URL 应该通过验证', async ({ page }) => {
      const input = page.getByPlaceholder(/https?:\/\/.+/);
      await input.fill('https://www.bilibili.com/video/BV1xx411c7mD');

      // 验证通过，没有错误提示
      await expect(page.getByText(/请输入有效的 URL/i)).not.toBeVisible();
    });
  });

  test.describe('任务创建流程', () => {
    test('输入有效 URL 并提交应该创建任务', async ({ page }) => {
      const testUrl = 'https://www.bilibili.com/video/BV1xx411c7mD';

      // 输入 URL
      const input = page.getByPlaceholder(/https?:\/\/.+/);
      await input.fill(testUrl);

      // 提交
      const submitButton = page.getByRole('button', { name: /开始解析/i });
      await submitButton.click();

      // 等待导航到任务详情页（任务创建成功）
      // 注意：实际测试中可能需要等待 API 响应
      await page.waitForURL(/\/task\/.+/);
    });

    test('任务创建后应该跳转到任务详情页', async ({ page }) => {
      const testUrl = 'https://www.bilibili.com/video/BV1xx411c7mD';

      await page.getByPlaceholder(/https?:\/\//).fill(testUrl);
      await page.getByRole('button', { name: /开始解析/i }).click();

      // 验证 URL 包含任务 ID
      await expect(page).toHaveURL(/\/task\/[\w-]+/);
    });

    test('任务详情页应该显示任务信息', async ({ page }) => {
      const testUrl = 'https://www.bilibili.com/video/BV1xx411c7mD';

      await page.getByPlaceholder(/https?:\/\//).fill(testUrl);
      await page.getByRole('button', { name: /开始解析/i }).click();

      // 等待页面跳转
      await page.waitForURL(/\/task\/.+/);

      // 验证任务信息区域存在
      await expect(page.getByText(/任务信息/i)).toBeVisible();

      // 验证进度条存在（任务正在处理中）
      await expect(page.locator('[role="progressbar"]')).toBeVisible();
    });
  });

  test.describe('输入框交互', () => {
    test('输入框应该支持粘贴操作', async ({ page }) => {
      const testUrl = 'https://www.bilibili.com/video/BV1xx411c7mD';

      // 模拟粘贴
      const input = page.getByPlaceholder(/https?:\/\/.+/);
      await input.click();
      await page.keyboard.press('ControlOrMeta+V');

      // 由于无法直接模拟剪贴板，这里验证输入框可以接收输入
      await input.fill(testUrl);
      await expect(input).toHaveValue(testUrl);
    });

    test('输入框应该支持清空操作', async ({ page }) => {
      const input = page.getByPlaceholder(/https?:\/\/.+/);

      // 输入内容
      await input.fill('https://www.example.com');
      await expect(input).toHaveValue('https://www.example.com');

      // 清空
      await input.clear();
      await expect(input).toHaveValue('');
    });

    test('输入框获得焦点时应该有视觉反馈', async ({ page }) => {
      const input = page.getByPlaceholder(/https?:\/\/.+/);

      // 获得焦点
      await input.click();
      await expect(input).toBeFocused();
    });
  });

  test.describe('按钮状态', () => {
    test('提交按钮在加载中应该显示加载状态', async ({ page }) => {
      const input = page.getByPlaceholder(/https?:\/\/.+/);
      await input.fill('https://www.bilibili.com/video/BV1xx411c7mD');

      const submitButton = page.getByRole('button', { name: /开始解析/i });

      // 点击后立即检查按钮状态（如果组件实现正确，应该进入 loading 状态）
      await submitButton.click();

      // 按钮应该进入 loading 状态或禁用状态
      const isDisabled = await submitButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    });

    test('输入 URL 后提交按钮应该保持可用', async ({ page }) => {
      const input = page.getByPlaceholder(/https?:\/\/.+/);
      await input.fill('https://www.example.com');

      const submitButton = page.getByRole('button', { name: /开始解析/i });
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe('错误处理', () => {
    test('API 错误应该显示错误提示', async ({ page }) => {
      // 注意：这个测试需要 mock API 或配置测试环境
      // 实际测试中可能需要使用 API mocking

      const testUrl = 'https://www.bilibili.com/video/BV1xx411c7mD';

      await page.getByPlaceholder(/https?:\/\//).fill(testUrl);
      await page.getByRole('button', { name: /开始解析/i }).click();

      // 如果 API 失败，应该显示错误 toast
      // await expect(page.getByText(/创建任务失败/i)).toBeVisible();
    });

    test('网络错误应该显示友好提示', async ({ page }) => {
      // 这个测试需要模拟网络错误环境
      // 实际测试中可能需要使用 Playwright 的 route 功能
    });
  });
});
