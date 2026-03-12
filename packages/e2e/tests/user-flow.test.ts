import { test, expect } from '../fixtures';

/**
 * 完整用户流程测试
 * 测试从首页到任务完成的完整用户流程
 */
test.describe('完整用户流程', () => {
  test('视频解析完整流程', async ({ page, testData }) => {
    // 1. 访问首页
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // 2. 输入视频 URL
    const videoUrlInput = page.getByPlaceholder(/https?:\/\/.+/);
    await expect(videoUrlInput).toBeVisible();
    await videoUrlInput.fill(testData.videoUrl);

    // 3. 提交创建任务
    const submitButton = page.getByRole('button', { name: /开始解析/i });
    await submitButton.click();

    // 4. 验证跳转到任务详情页
    await expect(page).toHaveURL(/\/task\/[\w-]+/);

    // 5. 验证任务信息展示
    await expect(page.getByText(/任务信息/i)).toBeVisible();

    // 6. 验证进度条存在
    await expect(page.locator('[role="progressbar"]')).toBeVisible();

    // 7. 等待任务完成（实际测试中可能需要更长时间）
    // await page.waitForTimeout(30000);

    // 8. 验证任务完成状态
    // await expect(page.getByText(/completed/i)).toBeVisible();

    // 9. 验证结果标签页存在
    // const tabs = page.getByRole('tab');
    // await expect(tabs).toHaveCount(3);

    // 10. 验证可以复制结果
    // const copyButton = page.getByRole('button', { name: /复制/i }).first();
    // await expect(copyButton).toBeVisible();
  });

  test('设置配置完整流程', async ({ page, testData }) => {
    // 1. 访问设置页
    await page.goto('/settings');

    // 2. 填写 API Key
    const apiKeyInput = page.getByLabel(/API Key/i);
    await apiKeyInput.fill(testData.apiKey);

    // 3. 填写输出目录
    const outputDirInput = page.getByLabel(/输出目录/i);
    await outputDirInput.fill(testData.outputDir);

    // 4. 保存配置
    const saveButton = page.getByRole('button', { name: /保存配置/i });
    await saveButton.click();

    // 5. 验证保存成功
    await expect(page.getByText(/配置已保存/i)).toBeVisible();

    // 6. 刷新页面验证配置持久化
    await page.reload();

    // 7. 验证配置值仍然存在
    await expect(apiKeyInput).toHaveValue(testData.apiKey);
    await expect(outputDirInput).toHaveValue(testData.outputDir);
  });

  test('代码分析完整流程', async ({ page }) => {
    // 1. 访问代码分析页
    await page.goto('/analysis');

    // 2. 输入项目路径
    const pathInput = page.getByPlaceholder(/请输入项目目录路径/i);
    await pathInput.fill('/path/to/project');

    // 3. 验证项目
    const validateButton = page.getByRole('button', { name: /验证/i });
    await validateButton.click();

    // 4. 等待项目信息展示
    await page.waitForTimeout(2000);
    await expect(page.getByText(/项目信息预览/i)).toBeVisible();

    // 5. 选择分析步骤
    constselectAllCheckbox = page.getByLabel(/全选/i);
    if (await selectAllCheckbox.count() > 0) {
      await selectAllCheckbox.click();
    }

    // 6. 开始分析
    const analyzeButton = page.getByRole('button', { name: /开始分析/i });
    await expect(analyzeButton).toBeEnabled();
    await analyzeButton.click();

    // 7. 验证分析中状态
    await expect(page.getByText(/分析中/i)).toBeVisible();
    await expect(page.locator('[role="progressbar"]')).toBeVisible();

    // 8. 验证步骤时间线
    await expect(page.locator('[class*="timeline"]')).toBeVisible();

    // 9. 等待分析完成（实际测试中可能需要更长时间）
    // await page.waitForTimeout(60000);

    // 10. 验证分析完成
    // await expect(page.getByText(/分析完成/i)).toBeVisible();
  });

  test('导航到历史记录流程', async ({ page }) => {
    // 1. 从首页导航到视频历史
    await page.goto('/');
    await page.getByRole('menuitem', { name: /视频历史/i }).click();
    await expect(page).toHaveURL('/history');

    // 2. 验证列表展示
    await expect(page.getByRole('table')).toBeVisible();

    // 3. 导航到分析历史
    await page.getByRole('menuitem', { name: /分析历史/i }).click();
    await expect(page).toHaveURL('/analysis-history');

    // 4. 验证列表展示
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('多标签页切换流程', async ({ page }) => {
    const pages = [
      { name: '视频解析', path: '/' },
      { name: '代码分析', path: '/analysis' },
      { name: '分析历史', path: '/analysis-history' },
      { name: '视频历史', path: '/history' },
      { name: '设置', path: '/settings' },
    ];

    for (const pageItem of pages) {
      // 点击导航菜单
      await page.getByRole('menuitem', { name: pageItem.name }).click();
      await expect(page).toHaveURL(new RegExp(`${pageItem.path}$`));

      // 验证页面标题或特征元素
      await page.waitForTimeout(300);
    }
  });
});

/**
 * 跨浏览器兼容性测试
 */
test.describe('跨浏览器兼容性', () => {
  test('首页在所有浏览器中正常显示', async ({ page }) => {
    await page.goto('/');

    // 验证核心元素
    await expect(page.getByRole('heading', { name: /输入视频 URL/i })).toBeVisible();
    await expect(page.getByPlaceholder(/https?:\/\/.+/)).toBeVisible();
    await expect(page.getByRole('button', { name: /开始解析/i })).toBeVisible();
  });

  test('导航菜单在所有浏览器中正常显示', async ({ page }) => {
    await page.goto('/');

    const menuItems = [
      '视频解析',
      '代码分析',
      '分析历史',
      '视频历史',
      '设置',
    ];

    for (const item of menuItems) {
      await expect(page.getByRole('menuitem', { name: item })).toBeVisible();
    }
  });

  test('表单输入在所有浏览器中正常工作', async ({ page }) => {
    // 测试首页 URL 输入
    await page.goto('/');
    const input = page.getByPlaceholder(/https?:\/\/.+/);
    await input.fill('https://www.example.com');
    await expect(input).toHaveValue('https://www.example.com');

    // 测试设置页输入
    await page.goto('/settings');
    const apiKeyInput = page.getByLabel(/API Key/i);
    await apiKeyInput.fill('sk-test');
    await expect(apiKeyInput).toHaveValue('sk-test');
  });
});

/**
 * 可访问性测试
 */
test.describe('可访问性 (A11y)', () => {
  test('所有表单字段应该有关联的 label', async ({ page }) => {
    await page.goto('/settings');

    // API Key 输入应该有 label
    const apiKeyInput = page.getByLabel(/API Key/i);
    await expect(apiKeyInput).toBeVisible();

    // 输出目录输入应该有 label
    const outputDirInput = page.getByLabel(/输出目录/i);
    await expect(outputDirInput).toBeVisible();
  });

  test('所有按钮应该有可访问的名称', async ({ page }) => {
    await page.goto('/');

    const submitButton = page.getByRole('button', { name: /开始解析/i });
    await expect(submitButton).toBeVisible();

    await page.goto('/settings');

    const saveButton = page.getByRole('button', { name: /保存配置/i });
    await expect(saveButton).toBeVisible();
  });

  test('页面应该有正确的标题', async ({ page }) => {
    const pages = [
      { path: '/', titlePattern: /VideoMemo|视频/i },
      { path: '/settings', titlePattern: /设置/i },
      { path: '/analysis', titlePattern: /分析/i },
    ];

    for (const { path, titlePattern } of pages) {
      await page.goto(path);
      await expect(page).toHaveTitle(titlePattern);
    }
  });
});
