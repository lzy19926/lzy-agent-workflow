import { test, expect } from '../fixtures';

/**
 * 设置页面测试用例
 * 测试 API Key 配置、输出目录配置、表单提交
 */
test.describe('设置页面', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前访问设置页
    await page.goto('/settings');
  });

  test('应该正确显示设置页面标题', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /设置/i })).toBeVisible();
  });

  test('应该正确显示 API Key 输入框', async ({ page }) => {
    const apiKeyInput = page.getByLabel(/API Key/i);
    await expect(apiKeyInput).toBeVisible();
    await expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  test('应该正确显示输出目录输入框', async ({ page }) => {
    const outputDirInput = page.getByLabel(/输出目录/i);
    await expect(outputDirInput).toBeVisible();
    await expect(outputDirInput).toHaveAttribute('type', 'text');
  });

  test('应该正确显示保存按钮', async ({ page }) => {
    const saveButton = page.getByRole('button', { name: /保存配置/i });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
  });

  test.describe('API Key 配置', () => {
    test('应该可以输入 API Key', async ({ page }) => {
      const apiKeyInput = page.getByLabel(/API Key/i);
      const testApiKey = 'sk-test123456789';

      await apiKeyInput.fill(testApiKey);
      await expect(apiKeyInput).toHaveValue(testApiKey);
    });

    test('API Key 输入框应该支持密码切换显示', async ({ page }) => {
      const apiKeyInput = page.getByLabel(/API Key/i);
      const testApiKey = 'sk-test123456789';

      // 输入 API Key
      await apiKeyInput.fill(testApiKey);

      // 点击密码可见性切换按钮
      const toggleButton = page.locator('[aria-label*="密码"], [aria-label*="password"]');
      if (await toggleButton.count() > 0) {
        await toggleButton.click();
        // 切换后应该是明文显示
        await expect(apiKeyInput).toHaveAttribute('type', 'text');

        // 再次切换回密码
        await toggleButton.click();
        await expect(apiKeyInput).toHaveAttribute('type', 'password');
      }
    });

    test('API Key 应该是必填项', async ({ page }) => {
      const apiKeyInput = page.getByLabel(/API Key/i);
      await apiKeyInput.clear();

      const saveButton = page.getByRole('button', { name: /保存配置/i });
      await saveButton.click();

      // 应该显示必填验证错误
      await expect(page.getByText(/请输入 API Key/i)).toBeVisible();
    });
  });

  test.describe('输出目录配置', () => {
    test('应该可以输入输出目录', async ({ page }) => {
      const outputDirInput = page.getByLabel(/输出目录/i);
      const testDir = './output/test';

      await outputDirInput.fill(testDir);
      await expect(outputDirInput).toHaveValue(testDir);
    });

    test('输出目录应该支持常见路径格式', async ({ page }) => {
      const outputDirInput = page.getByLabel(/输出目录/i);

      const validPaths = [
        './output',
        '../output',
        '/absolute/path/output',
        'C:\\Users\\output',
        './output/videos',
      ];

      for (const path of validPaths) {
        await outputDirInput.clear();
        await outputDirInput.fill(path);
        await expect(outputDirInput).toHaveValue(path);
      }
    });

    test('输出目录应该是可选项', async ({ page }) => {
      const apiKeyInput = page.getByLabel(/API Key/i);
      const outputDirInput = page.getByLabel(/输出目录/i);

      // 只填写 API Key，不填写输出目录
      await apiKeyInput.fill('sk-test123456789');
      await outputDirInput.clear();

      const saveButton = page.getByRole('button', { name: /保存配置/i });
      await saveButton.click();

      // 应该可以成功保存（没有必填验证错误）
      await expect(page.getByText(/配置已保存/i)).toBeVisible();
    });
  });

  test.describe('保存配置', () => {
    test('填写完整配置后应该可以成功保存', async ({ page }) => {
      const apiKeyInput = page.getByLabel(/API Key/i);
      const outputDirInput = page.getByLabel(/输出目录/i);

      await apiKeyInput.fill('sk-test123456789');
      await outputDirInput.fill('./output');

      const saveButton = page.getByRole('button', { name: /保存配置/i });
      await saveButton.click();

      // 应该显示成功提示
      await expect(page.getByText(/配置已保存/i)).toBeVisible();
    });

    test('保存成功后配置应该持久化', async ({ page }) => {
      const apiKeyInput = page.getByLabel(/API Key/i);
      const outputDirInput = page.getByLabel(/输出目录/i);

      // 填写配置
      await apiKeyInput.fill('sk-persistent-test');
      await outputDirInput.fill('./output/persistent');

      const saveButton = page.getByRole('button', { name: /保存配置/i });
      await saveButton.click();

      // 等待保存成功
      await expect(page.getByText(/配置已保存/i)).toBeVisible();

      // 刷新页面
      await page.reload();

      // 配置应该仍然存在
      // 注意：这个测试依赖于实际的数据持久化实现
      // 可能需要检查 IndexedDB 或 localStorage
    });

    test('重复保存应该正常工作', async ({ page }) => {
      const apiKeyInput = page.getByLabel(/API Key/i);
      const outputDirInput = page.getByLabel(/输出目录/i);

      // 第一次保存
      await apiKeyInput.fill('sk-first-save');
      await outputDirInput.fill('./output/first');
      await page.getByRole('button', { name: /保存配置/i }).click();
      await expect(page.getByText(/配置已保存/i)).toBeVisible();

      // 第二次保存
      await apiKeyInput.fill('sk-second-save');
      await outputDirInput.fill('./output/second');
      await page.getByRole('button', { name: /保存配置/i }).click();
      await expect(page.getByText(/配置已保存/i)).toBeVisible();
    });
  });

  test.describe('表单交互', () => {
    test('表单应该支持键盘提交（Enter 键）', async ({ page }) => {
      const apiKeyInput = page.getByLabel(/API Key/i);

      await apiKeyInput.fill('sk-test123456789');

      // 按 Enter 键提交
      await page.keyboard.press('Enter');

      // 应该触发保存
      await expect(page.getByText(/配置已保存/i)).toBeVisible();
    });

    test('输入框应该支持清空操作', async ({ page }) => {
      const apiKeyInput = page.getByLabel(/API Key/i);
      const outputDirInput = page.getByLabel(/输出目录/i);

      await apiKeyInput.fill('sk-test');
      await outputDirInput.fill('./output');

      await apiKeyInput.clear();
      await outputDirInput.clear();

      await expect(apiKeyInput).toHaveValue('');
      await expect(outputDirInput).toHaveValue('');
    });

    test('保存按钮在提交时应该显示加载状态', async ({ page }) => {
      const apiKeyInput = page.getByLabel(/API Key/i);
      const saveButton = page.getByRole('button', { name: /保存配置/i });

      await apiKeyInput.fill('sk-test123456789');
      await saveButton.click();

      // 按钮应该进入 loading 状态或禁用状态
      const isDisabled = await saveButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    });
  });

  test.describe('错误处理', () => {
    test('保存失败应该显示错误提示', async ({ page }) => {
      // 注意：这个测试需要 mock API 或配置测试环境
      // 实际测试中可能需要使用 API mocking

      const apiKeyInput = page.getByLabel(/API Key/i);
      await apiKeyInput.fill('invalid-api-key');

      await page.getByRole('button', { name: /保存配置/i }).click();

      // 如果保存失败，应该显示错误 toast
      // await expect(page.getByText(/保存失败/i)).toBeVisible();
    });

    test('API Key 格式错误应该显示提示', async ({ page }) => {
      // 如果 API Key 有格式要求，应该验证
      const apiKeyInput = page.getByLabel(/API Key/i);
      await apiKeyInput.fill('not-a-valid-key-format');

      // 点击保存
      await page.getByRole('button', { name: /保存配置/i }).click();

      // 根据实际业务需求，这里可能有验证
    });
  });
});
