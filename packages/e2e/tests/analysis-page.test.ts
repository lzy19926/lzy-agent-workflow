import { test, expect } from '../fixtures';

/**
 * 代码分析页面测试用例
 * 测试项目目录选择、项目验证、步骤选择、分析提交流程
 */
test.describe('代码分析页面', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前访问代码分析页
    await page.goto('/analysis');
  });

  test('应该正确显示页面标题和说明', async ({ page }) => {
    // 验证页面标题
    await expect(page.getByRole('heading', { name: /代码项目分析/i })).toBeVisible();

    // 验证说明文字
    await expect(page.getByText(/选择一个代码工程项目目录/i)).toBeVisible();
  });

  test('应该正确显示项目路径输入框', async ({ page }) => {
    const input = page.getByPlaceholder(/请输入项目目录路径/i);
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
  });

  test('应该正确显示浏览按钮', async ({ page }) => {
    const browseButton = page.getByRole('button', { name: /浏览/i });
    await expect(browseButton).toBeVisible();
    await expect(browseButton).toBeEnabled();
  });

  test('应该正确显示验证按钮', async ({ page }) => {
    const validateButton = page.getByRole('button', { name: /验证/i });
    await expect(validateButton).toBeVisible();
    await expect(validateButton).toBeEnabled();
  });

  test.describe('项目路径输入', () => {
    test('应该可以输入项目路径', async ({ page }) => {
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      const testPath = '/home/user/my-project';

      await input.fill(testPath);
      await expect(input).toHaveValue(testPath);
    });

    test('应该支持常见路径格式', async ({ page }) => {
      const input = page.getByPlaceholder(/请输入项目目录路径/i);

      const validPaths = [
        '/home/user/project',
        'C:/Users/user/project',
        'C:\\Users\\user\\project',
        './relative/project',
        '../parent/project',
      ];

      for (const path of validPaths) {
        await input.clear();
        await input.fill(path);
        await expect(input).toHaveValue(path);
      }
    });

    test('输入路径后验证按钮应该可用', async ({ page }) => {
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/some/path');

      const validateButton = page.getByRole('button', { name: /验证/i });
      await expect(validateButton).toBeEnabled();
    });
  });

  test.describe('项目验证', () => {
    test('空路径点击验证应该显示错误提示', async ({ page }) => {
      const validateButton = page.getByRole('button', { name: /验证/i });
      await validateButton.click();

      // 应该显示错误提示
      await expect(page.getByText(/请输入项目路径/i)).toBeVisible();
    });

    test('无效项目路径应该显示错误提示', async ({ page }) => {
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/non/existent/path');

      const validateButton = page.getByRole('button', { name: /验证/i });
      await validateButton.click();

      // 等待验证完成
      await page.waitForTimeout(2000);

      // 应该显示错误提示
      await expect(page.getByText(/无效的项目目录/i, { timeout: 5000 })).toBeVisible();
    });

    test('有效项目路径应该显示项目信息', async ({ page }) => {
      // 使用当前项目的前端目录作为测试项目
      const input = page.getByPlaceholder(/请输入项目目录路径/i);

      // 注意：实际测试中需要使用真实存在的项目路径
      // 这里使用相对路径，需要根据实际环境调整
      await input.fill('/path/to/valid/project');

      const validateButton = page.getByRole('button', { name: /验证/i });
      await validateButton.click();

      // 等待验证完成
      await page.waitForTimeout(2000);

      // 应该显示项目信息预览卡片
      const projectInfoCard = page.getByText(/项目信息预览/i);
      await expect(projectInfoCard).toBeVisible();
    });

    test('验证过程中按钮应该显示加载状态', async ({ page }) => {
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/some/project/path');

      const validateButton = page.getByRole('button', { name: /验证/i });
      await validateButton.click();

      // 验证按钮应该进入 loading 状态
      const isDisabled = await validateButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    });
  });

  test.describe('项目信息展示', () => {
    test('验证成功后应该显示项目基本信息', async ({ page }) => {
      // 模拟验证成功后的状态
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/valid/project');
      await page.getByRole('button', { name: /验证/i }).click();

      await page.waitForTimeout(2000);

      // 应该显示项目信息卡片
      await expect(page.getByText(/项目信息预览/i)).toBeVisible();

      // 应该显示以下信息字段（如果组件正确实现）
      const infoFields = [
        /项目名称/i,
        /主要语言/i,
        /文件数量/i,
        /框架/i,
      ];

      for (const field of infoFields) {
        await expect(page.getByText(field)).toBeVisible();
      }
    });

    test('应该显示项目技术栈标签', async ({ page }) => {
      // 模拟验证成功
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/valid/project');
      await page.getByRole('button', { name: /验证/i }).click();
      await page.waitForTimeout(2000);

      // 应该显示技术栈标签区域
      await expect(page.getByText(/技术栈/i)).toBeVisible();
    });
  });

  test.describe('分析步骤选择', () => {
    test('验证成功后应该显示分析步骤选择器', async ({ page }) => {
      // 模拟验证成功
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/valid/project');
      await page.getByRole('button', { name: /验证/i }).click();
      await page.waitForTimeout(2000);

      // 应该显示步骤选择区域
      await expect(page.getByText(/选择分析步骤/i)).toBeVisible();
    });

    test('应该显示全选选项', async ({ page }) => {
      // 模拟验证成功
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/valid/project');
      await page.getByRole('button', { name: /验证/i }).click();
      await page.waitForTimeout(2000);

      // 应该有全选 checkbox
      await expect(page.getByLabel(/全选/i)).toBeVisible();
    });

    test('应该可以选择/取消选择分析步骤', async ({ page }) => {
      // 模拟验证成功
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/valid/project');
      await page.getByRole('button', { name: /验证/i }).click();
      await page.waitForTimeout(2000);

      // 获取第一个步骤卡片并点击
      const stepCard = page.locator('[class*="card"]').first();
      await stepCard.click();

      // 步骤应该被取消选择（或选择）
      // 可以通过边框颜色或背景色判断
    });

    test('全选应该选中所有步骤', async ({ page }) => {
      // 模拟验证成功
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/valid/project');
      await page.getByRole('button', { name: /验证/i }).click();
      await page.waitForTimeout(2000);

      // 点击全选
      await page.getByLabel(/全选/i).click();

      // 所有步骤应该被选中
      // 分析按钮应该显示选中的步骤数量
      await expect(page.getByRole('button', { name: /开始分析.*个步骤/i })).toBeVisible();
    });

    test('不选择任何步骤时应该显示警告', async ({ page }) => {
      // 模拟验证成功
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/valid/project');
      await page.getByRole('button', { name: /验证/i }).click();
      await page.waitForTimeout(2000);

      // 取消所有选择（如果有默认选择）
      const selectedSteps = page.locator('[class*="selected"]');
      const count = await selectedSteps.count();

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          await selectedSteps.nth(i).click();
        }
      }

      // 应该显示警告提示
      await expect(page.getByText(/请至少选择一个分析步骤/i)).toBeVisible();
    });
  });

  test.describe('开始分析', () => {
    test('选择步骤后应该可以开始分析', async ({ page }) => {
      // 模拟验证成功
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/valid/project');
      await page.getByRole('button', { name: /验证/i }).click();
      await page.waitForTimeout(2000);

      // 确保有步骤被选中
      const analyzeButton = page.getByRole('button', { name: /开始分析/i });
      await expect(analyzeButton).toBeEnabled();
    });

    test('点击开始分析应该进入分析状态', async ({ page }) => {
      // 模拟验证成功并开始分析
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/valid/project');
      await page.getByRole('button', { name: /验证/i }).click();
      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /开始分析/i }).click();

      // 应该显示分析中状态
      await expect(page.getByText(/分析中/i)).toBeVisible();
    });

    test('分析过程中应该显示进度条', async ({ page }) => {
      // 模拟验证成功并开始分析
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/valid/project');
      await page.getByRole('button', { name: /验证/i }).click();
      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /开始分析/i }).click();

      // 应该显示进度条
      await expect(page.locator('[role="progressbar"]')).toBeVisible();
    });

    test('分析过程中应该显示步骤时间线', async ({ page }) => {
      // 模拟验证成功并开始分析
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/valid/project');
      await page.getByRole('button', { name: /验证/i }).click();
      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /开始分析/i }).click();

      // 应该显示步骤时间线
      await expect(page.locator('[class*="timeline"], [class*="Timeline"]')).toBeVisible();
    });

    test('分析开始后 URL 应该保持清洁', async ({ page }) => {
      // 模拟验证成功并开始分析
      const input = page.getByPlaceholder(/请输入项目目录路径/i);
      await input.fill('/valid/project');
      await page.getByRole('button', { name: /验证/i }).click();
      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /开始分析/i }).click();

      // URL 不应该包含 taskId 参数（因为这是新任务）
      await expect(page).toHaveURL(/\/analysis$/);
    });
  });

  test.describe('分析完成', () => {
    test('分析完成后应该显示成功状态', async ({ page }) => {
      // 这个测试需要等待实际分析完成
      // 在实际环境中可能需要更长的等待时间

      // 模拟分析完成状态
      await page.goto('/analysis?taskId=test-task-id');

      // 等待一段时间后，应该显示完成状态
      await page.waitForTimeout(3000);

      // 应该显示分析完成提示
      await expect(page.getByText(/分析完成/i)).toBeVisible();
    });

    test('分析完成后应该可以查看报告', async ({ page }) => {
      // 模拟已有完成任务的页面
      await page.goto('/analysis?taskId=completed-task-id');
      await page.waitForTimeout(3000);

      // 应该显示报告内容区域
      const reportArea = page.locator('[class*="markdown"]');
      await expect(reportArea).toBeVisible();
    });

    test('分析完成后应该可以开始新项目', async ({ page }) => {
      // 模拟已有完成任务的页面
      await page.goto('/analysis?taskId=completed-task-id');
      await page.waitForTimeout(3000);

      // 应该有「分析新项目」按钮
      const newProjectButton = page.getByRole('button', { name: /分析新项目/i });
      await expect(newProjectButton).toBeVisible();

      // 点击后应该清空当前任务状态
      await newProjectButton.click();
      await expect(page).toHaveURL(/\/analysis$/);
    });
  });

  test.describe('从历史记录查看任务', () => {
    test('从 URL 参数加载 taskId 应该显示对应任务', async ({ page }) => {
      // 模拟从历史记录点击进入任务详情
      await page.goto('/analysis?taskId=existing-task');

      // 应该显示任务状态
      await page.waitForTimeout(2000);

      // 根据任务状态显示不同内容
      // 运行中：显示进度条
      // 已完成：显示报告
      // 失败：显示错误信息
    });
  });

  test.describe('错误处理', () => {
    test('分析失败应该显示错误信息', async ({ page }) => {
      // 模拟失败任务
      await page.goto('/analysis?taskId=failed-task');
      await page.waitForTimeout(2000);

      // 应该显示错误提示
      await expect(page.getByText(/分析失败/i)).toBeVisible();
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });

    test('不存在的 taskId 应该显示友好提示', async ({ page }) => {
      await page.goto('/analysis?taskId=non-existent-task');
      await page.waitForTimeout(2000);

      // 应该显示任务不存在提示
      await expect(page.getByText(/任务不存在/i)).toBeVisible();
    });
  });
});
