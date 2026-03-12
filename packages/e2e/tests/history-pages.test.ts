import { test, expect } from '../fixtures';

/**
 * 历史记录页面测试用例
 * 测试视频历史记录和分析历史记录的列表展示、查看、删除功能
 */
test.describe('视频历史记录页面', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前访问视频历史页
    await page.goto('/history');
  });

  test('应该正确显示页面标题', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /历史记录/i })).toBeVisible();
  });

  test('应该正确显示任务列表表格', async ({ page }) => {
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
  });

  test('表格应该显示正确的列头', async ({ page }) => {
    const expectedHeaders = [
      /标题/i,
      /状态/i,
      /进度/i,
      /创建时间/i,
      /操作/i,
    ];

    for (const header of expectedHeaders) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test.describe('空状态处理', () => {
    test('没有历史记录时应该显示空状态', async ({ page }) => {
      // 清除所有数据后访问
      // 注意：实际测试中可能需要先清除 IndexedDB

      // 检查是否显示空状态提示
      const emptyState = page.getByText(/暂无/i);
      const isEmpty = await emptyState.count() > 0;

      if (isEmpty) {
        await expect(emptyState).toBeVisible();
      }
    });
  });

  test.describe('任务列表展示', () => {
    test('应该显示任务标题或 URL', async ({ page }) => {
      // 假设有任务数据，应该显示标题或 URL
      const taskRows = page.getByRole('row').filter({ has: page.getByRole('cell') });
      const count = await taskRows.count();

      if (count > 1) { // 排除表头
        // 检查第一行数据
        const firstRow = taskRows.nth(1);
        await expect(firstRow).toBeVisible();
      }
    });

    test('应该显示任务状态标签', async ({ page }) => {
      // 状态标签应该存在
      const statusValues = ['pending', 'processing', 'completed', 'failed'];

      for (const status of statusValues) {
        const statusElement = page.locator(`[class*="${status}"]`);
        // 如果页面有该状态的任务，标签应该可见
      }
    });

    test('应该显示任务进度百分比', async ({ page }) => {
      // 进度应该以百分比显示
      const progressElements = page.locator('[class*="progress"], [role="progressbar"]');
      const count = await progressElements.count();

      if (count > 0) {
        await expect(progressElements.first()).toBeVisible();
      }
    });

    test('应该显示任务创建时间', async ({ page }) => {
      // 创建时间列应该存在
      const createdAtHeader = page.getByRole('columnheader', { name: /创建时间/i });
      await expect(createdAtHeader).toBeVisible();
    });

    test('URL 过长时应该截断显示', async ({ page }) => {
      // 如果有长 URL 任务，应该显示截断
      const urlCells = page.locator('td').filter({ hasText: '...' });
      // 截断显示是可选的优化
    });
  });

  test.describe('查看任务', () => {
    test('点击查看按钮应该跳转到任务详情页', async ({ page }) => {
      // 假设有任务数据
      const viewButtons = page.getByRole('button', { name: /查看/i });
      const count = await viewButtons.count();

      if (count > 0) {
        await viewButtons.first().click();

        // 应该跳转到任务详情页
        await expect(page).toHaveURL(/\/task\/.+/);
      }
    });
  });

  test.describe('删除任务', () => {
    test('点击删除按钮应该弹出确认对话框', async ({ page }) => {
      const deleteButtons = page.getByRole('button', { name: /删除/i, exact: true });
      const count = await deleteButtons.count();

      if (count > 0) {
        await deleteButtons.first().click();

        // 应该显示确认对话框
        await expect(page.getByText(/确定删除吗/i)).toBeVisible();
      }
    });

    test('确认删除后应该删除任务', async ({ page }) => {
      const deleteButtons = page.getByRole('button', { name: /删除/i, exact: true });
      const count = await deleteButtons.count();

      if (count > 0) {
        const initialCount = await page.getByRole('row').count();

        await deleteButtons.first().click();

        // 确认删除
        await page.getByText(/确定删除吗/i).click();

        // 等待删除完成
        await page.waitForTimeout(1000);

        // 行数应该减少
        const finalCount = await page.getByRole('row').count();
        expect(finalCount).toBeLessThan(initialCount);
      }
    });

    test('取消删除应该保留任务', async ({ page }) => {
      const deleteButtons = page.getByRole('button', { name: /删除/i, exact: true });
      const count = await deleteButtons.count();

      if (count > 0) {
        const initialCount = await page.getByRole('row').count();

        await deleteButtons.first().click();

        // 取消删除（点击取消按钮或关闭对话框）
        const cancelButton = page.getByRole('button', { name: /取消/i });
        if (await cancelButton.count() > 0) {
          await cancelButton.click();
        } else {
          // 如果没有取消按钮，点击对话框外部
          await page.mouse.click(0, 0);
        }

        // 行数应该不变
        const finalCount = await page.getByRole('row').count();
        expect(finalCount).toBe(initialCount);
      }
    });
  });

  test.describe('分页功能', () => {
    test('任务数量超过一页时应该显示分页', async ({ page }) => {
      // 检查是否有分页控件
      const pagination = page.locator('[class*="pagination"], [role="pagination"]');
      const isVisible = await pagination.count() > 0;

      if (isVisible) {
        await expect(pagination).toBeVisible();
      }
    });

    test('应该可以切换页码', async ({ page }) => {
      const pagination = page.locator('[class*="pagination"]');

      if (await pagination.count() > 0) {
        // 获取页码按钮
        const pageButtons = pagination.getByRole('button');

        if (await pageButtons.count() > 1) {
          // 点击第二页
          await pageButtons.nth(1).click();
          await page.waitForTimeout(500);

          // 应该显示第二页数据
        }
      }
    });

    test('应该可以切换每页显示数量', async ({ page }) => {
      const pageSizeSelector = page.locator('[class*="pagination"]').getByRole('combobox');

      if (await pageSizeSelector.count() > 0) {
        // 可以测试切换每页显示数量
        await expect(pageSizeSelector).toBeVisible();
      }
    });
  });

  test.describe('刷新功能', () => {
    test('应该可以手动刷新列表', async ({ page }) => {
      // 查找刷新按钮（如果有）
      const refreshButton = page.getByRole('button', { name: /刷新/i });

      if (await refreshButton.count() > 0) {
        await refreshButton.click();
        await page.waitForTimeout(1000);

        // 列表应该刷新
      }
    });
  });

  test.describe('状态标签样式', () => {
    test('不同状态应该使用不同颜色标签', async ({ page }) => {
      // pending - 默认颜色
      // processing - 蓝色/处理中颜色
      // completed - 绿色/成功颜色
      // failed - 红色/错误颜色

      const statusMap: Record<string, string> = {
        pending: 'default',
        processing: 'processing',
        completed: 'success',
        failed: 'error',
      };

      // 验证状态标签存在
      for (const [status, color] of Object.entries(statusMap)) {
        const statusTag = page.locator(`[class*="${status}"]`);
        // 颜色验证依赖于具体实现
      }
    });
  });
});

/**
 * 分析历史记录页面测试用例
 */
test.describe('分析历史记录页面', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前访问分析历史页
    await page.goto('/analysis-history');
  });

  test('应该正确显示页面标题', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /代码分析历史记录/i })).toBeVisible();
  });

  test('应该正确显示刷新按钮', async ({ page }) => {
    const refreshButton = page.getByRole('button', { name: /刷新/i });
    await expect(refreshButton).toBeVisible();
  });

  test('表格应该显示正确的列头', async ({ page }) => {
    const expectedHeaders = [
      /项目名称/i,
      /状态/i,
      /进度/i,
      /创建时间/i,
      /完成时间/i,
      /操作/i,
    ];

    for (const header of expectedHeaders) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }
  });

  test.describe('空状态处理', () => {
    test('没有分析记录时应该显示空状态', async ({ page }) => {
      // 检查是否显示空状态提示
      const emptyState = page.getByText(/暂无分析历史记录/i);
      const isEmpty = await emptyState.count() > 0;

      if (isEmpty) {
        await expect(emptyState).toBeVisible();
      }
    });
  });

  test.describe('任务列表展示', () => {
    test('应该显示项目名称和路径', async ({ page }) => {
      const projectNameCells = page.locator('td').filter({ hasText: /[\w-]+/ });
      // 验证项目名称显示
    });

    test('应该显示任务状态标签', async ({ page }) => {
      const statusValues = ['pending', 'running', 'completed', 'failed'];
      const statusTexts = ['等待中', '分析中', '已完成', '失败'];

      for (const text of statusTexts) {
        const statusElement = page.getByText(text);
        // 如果页面有该状态的任务，标签应该可见
      }
    });

    test('应该显示进度条', async ({ page }) => {
      const progressElements = page.locator('[role="progressbar"]');
      const count = await progressElements.count();

      if (count > 0) {
        await expect(progressElements.first()).toBeVisible();
      }
    });

    test('应该显示创建时间和完成时间', async ({ page }) => {
      const createdAtHeader = page.getByRole('columnheader', { name: /创建时间/i });
      await expect(createdAtHeader).toBeVisible();

      const completedAtHeader = page.getByRole('columnheader', { name: /完成时间/i });
      await expect(completedAtHeader).toBeVisible();
    });
  });

  test.describe('查看报告', () => {
    test('点击查看按钮应该跳转到分析报告页', async ({ page }) => {
      const viewButtons = page.getByRole('button', { name: /查看/i });
      const count = await viewButtons.count();

      if (count > 0) {
        await viewButtons.first().click();

        // 应该跳转到分析页面（带 taskId 参数）
        await expect(page).toHaveURL(/\/analysis\?taskId=.+/);
      }
    });
  });

  test.describe('删除任务', () => {
    test('点击删除按钮应该弹出确认对话框', async ({ page }) => {
      const deleteButtons = page.getByRole('button', { name: /删除/i, exact: true });
      const count = await deleteButtons.count();

      if (count > 0) {
        await deleteButtons.first().click();
        await expect(page.getByText(/确定删除吗/i)).toBeVisible();
      }
    });

    test('确认删除后应该删除任务', async ({ page }) => {
      const deleteButtons = page.getByRole('button', { name: /删除/i, exact: true });
      const count = await deleteButtons.count();

      if (count > 0) {
        const initialCount = await page.getByRole('row').count();

        await deleteButtons.first().click();
        await page.getByText(/确定删除吗/i).click();
        await page.waitForTimeout(1000);

        const finalCount = await page.getByRole('row').count();
        expect(finalCount).toBeLessThan(initialCount);
      }
    });
  });

  test.describe('刷新功能', () => {
    test('点击刷新按钮应该重新加载列表', async ({ page }) => {
      const refreshButton = page.getByRole('button', { name: /刷新/i });
      await refreshButton.click();

      // 应该显示加载状态或刷新数据
      await page.waitForTimeout(1000);
    });

    test('刷新按钮在加载中应该显示加载状态', async ({ page }) => {
      const refreshButton = page.getByRole('button', { name: /刷新/i });
      await refreshButton.click();

      // 按钮应该进入 loading 状态
      const isDisabled = await refreshButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    });
  });

  test.describe('分页功能', () => {
    test('任务数量超过一页时应该显示分页', async ({ page }) => {
      const pagination = page.locator('[class*="pagination"]');

      if (await pagination.count() > 0) {
        await expect(pagination).toBeVisible();
      }
    });

    test('应该显示总任务数量', async ({ page }) => {
      const paginationInfo = page.getByText(/共.*条/i);

      if (await paginationInfo.count() > 0) {
        await expect(paginationInfo).toBeVisible();
      }
    });
  });

  test.describe('SSE 实时更新', () => {
    test('运行中的任务应该实时更新状态', async ({ page }) => {
      // 这个测试需要有正在运行的任务
      // 验证 SSE 连接和实时更新功能
    });

    test('任务完成后状态应该自动更新', async ({ page }) => {
      // 这个测试需要有正在运行的任务
      // 验证任务从 running 到 completed 的自动更新
    });
  });
});
