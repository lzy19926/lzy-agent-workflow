import { test, expect } from '../fixtures';

/**
 * 导航和布局测试用例
 * 测试主导航菜单、路由跳转、Layout 组件
 */
test.describe('导航和布局', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前访问首页
    await page.goto('/');
  });

  test('应该正确显示主导航菜单', async ({ page }) => {
    // 验证导航菜单项存在
    await expect(page.getByRole('menu')).toBeVisible();

    // 验证所有菜单项
    const menuItems = [
      { name: '视频解析', path: '/' },
      { name: '代码分析', path: '/analysis' },
      { name: '分析历史', path: '/analysis-history' },
      { name: '视频历史', path: '/history' },
      { name: '设置', path: '/settings' },
    ];

    for (const item of menuItems) {
      const menuItem = page.getByRole('menuitem', { name: item.name });
      await expect(menuItem).toBeVisible();
    }
  });

  test('点击导航菜单应该正确跳转页面', async ({ page }) => {
    const navTests = [
      { name: '视频解析', path: '/', url: '/' },
      { name: '代码分析', path: '/analysis', url: '/analysis' },
      { name: '分析历史', path: '/analysis-history', url: '/analysis-history' },
      { name: '视频历史', path: '/history', url: '/history' },
      { name: '设置', path: '/settings', url: '/settings' },
    ];

    for (const item of navTests) {
      // 点击菜单项
      const menuItem = page.getByRole('menuitem', { name: item.name });
      await menuItem.click();

      // 验证 URL 跳转
      await expect(page).toHaveURL(new RegExp(`${item.url}$`));

      // 验证页面标题或特征元素
      await page.waitForTimeout(500); // 等待页面渲染
    }
  });

  test('当前激活的导航菜单项应该高亮显示', async ({ page }) => {
    // 访问首页
    await page.goto('/');
    await expect(page.getByRole('menuitem', { name: '视频解析' }))
      .toHaveAttribute('aria-selected', 'true');

    // 访问代码分析页面
    await page.goto('/analysis');
    await expect(page.getByRole('menuitem', { name: '代码分析' }))
      .toHaveAttribute('aria-selected', 'true');

    // 访问设置页面
    await page.goto('/settings');
    await expect(page.getByRole('menuitem', { name: '设置' }))
      .toHaveAttribute('aria-selected', 'true');
  });

  test('应该正确显示应用 Logo/标题', async ({ page }) => {
    const logoElement = page.getByText('VideoMemo');
    await expect(logoElement).toBeVisible();
    await expect(logoElement).toHaveText('VideoMemo');
  });

  test('页面布局应该响应式', async ({ page }) => {
    // 测试桌面视口
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole('menu')).toBeVisible();

    // 测试平板视口
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('menu')).toBeVisible();

    // 测试移动视口
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('menu')).toBeVisible();
  });

  test('未知路由应该重定向到首页', async ({ page }) => {
    // 访问不存在的路由
    await page.goto('/non-existent-page');

    // 应该被重定向到首页
    await expect(page).toHaveURL(/\/$/);
  });

  test('内容区域应该正确显示', async ({ page }) => {
    // 验证内容区域存在
    const contentArea = page.locator('[role="main"], [class*="content"], [class*="Content"]');
    await expect(contentArea).toBeVisible();
  });

  test.describe('路由历史导航', () => {
    test('浏览器后退按钮应该正常工作', async ({ page }) => {
      // 从首页到设置页
      await page.goto('/');
      const homeUrl = page.url();

      await page.goto('/settings');
      await expect(page).toHaveURL('/settings');

      // 后退
      await page.goBack();
      await expect(page).toHaveURL(homeUrl);
    });

    test('浏览器前进按钮应该正常工作', async ({ page }) => {
      await page.goto('/');
      await page.goto('/settings');

      // 后退
      await page.goBack();
      await expect(page).toHaveURL('/');

      // 前进
      await page.goForward();
      await expect(page).toHaveURL('/settings');
    });
  });
});
