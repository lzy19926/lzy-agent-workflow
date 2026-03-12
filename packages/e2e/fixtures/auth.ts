import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * 全局测试设置
 * 处理测试前后的通用逻辑
 */

// 扩展测试选项，支持认证状态
type Fixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  // 认证页面 fixture
  authenticatedPage: async ({ page }, use) => {
    // 在认证之前，先访问设置页面配置 API Key
    await page.goto('/settings');

    // 配置 API Key（模拟认证）
    const apiKeyInput = page.getByLabel(/API Key/i);
    await apiKeyInput.fill('sk-test-e2e-key');

    const saveButton = page.getByRole('button', { name: /保存配置/i });
    await saveButton.click();

    // 等待保存成功提示
    await page.waitForSelector('text=配置已保存', { timeout: 5000 });

    await use(page);
  },
});

export { test as testWithAuth };
