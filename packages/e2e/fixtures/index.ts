import { test as base, expect, Page } from '@playwright/test';

/**
 * 自定义测试 fixtures
 * 提供通用的测试工具和页面模型
 */

// 测试数据结构
export interface TestData {
  // 视频任务相关
  videoUrl: string;
  invalidUrl: string;

  // 设置相关
  apiKey: string;
  outputDir: string;

  // 代码分析相关
  projectPath: string;
  invalidProjectPath: string;
}

// 页面 POM 接口
export interface PageObjects {
  HomePage: HomePage;
  SettingsPage: SettingsPage;
  AnalysisPage: AnalysisPage;
  HistoryPage: HistoryPage;
  AnalysisHistoryPage: AnalysisHistoryPage;
}

// 测试数据 fixtures
export const test = base.extend<{
  testData: TestData;
  pages: PageObjects;
}>({
  // 测试数据
  testData: async ({}, use) => {
    const testData: TestData = {
      // 有效的视频 URL（使用示例 URL）
      videoUrl: 'https://www.bilibili.com/video/BV1xx411c7mD',
      // 无效的 URL 格式
      invalidUrl: 'not-a-valid-url',

      // API 配置
      apiKey: 'sk-test123456789',
      outputDir: './output/test',

      // 项目路径（使用当前项目作为测试项目）
      projectPath: process.cwd() + '/../frontend',
      invalidProjectPath: '/non/existent/path',
    };
    await use(testData);
  },

  // 页面模型
  pages: async ({ page }, use) => {
    const pages: PageObjects = {
      HomePage: new HomePage(page),
      SettingsPage: new SettingsPage(page),
      AnalysisPage: new AnalysisPage(page),
      HistoryPage: new HistoryPage(page),
      AnalysisHistoryPage: new AnalysisHistoryPage(page),
    };
    await use(pages);
  },
});

export { expect };

/**
 * 首页页面对象模型
 */
export class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  // 元素选择器
  get videoUrlInput() {
    return this.page.getByPlaceholder(/https?:\/\/.+/);
  }

  get submitButton() {
    return this.page.getByRole('button', { name: /开始解析/i });
  }

  get pageTitle() {
    return this.page.getByRole('heading', { name: /输入视频 URL/i });
  }

  // 操作方法
  async enterVideoUrl(url: string) {
    await this.videoUrlInput.fill(url);
  }

  async submit() {
    await this.submitButton.click();
  }

  async createVideoTask(url: string) {
    await this.enterVideoUrl(url);
    await this.submit();
  }
}

/**
 * 设置页面对象模型
 */
export class SettingsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/settings');
  }

  // 元素选择器
  get apiKeyInput() {
    return this.page.getByLabel(/API Key/i);
  }

  get outputDirInput() {
    return this.page.getByLabel(/输出目录/i);
  }

  get saveButton() {
    return this.page.getByRole('button', { name: /保存配置/i });
  }

  // 操作方法
  async setApiKey(key: string) {
    await this.apiKeyInput.fill(key);
  }

  async setOutputDir(dir: string) {
    await this.outputDirInput.fill(dir);
  }

  async saveSettings() {
    await this.saveButton.click();
  }

  async configureSettings(apiKey: string, outputDir: string) {
    await this.setApiKey(apiKey);
    await this.setOutputDir(outputDir);
    await this.saveSettings();
  }
}

/**
 * 代码分析页面对象模型
 */
export class AnalysisPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/analysis');
  }

  // 元素选择器
  get projectPathInput() {
    return this.page.getByPlaceholder(/请输入项目目录路径/i);
  }

  get browseButton() {
    return this.page.getByRole('button', { name: /浏览/i });
  }

  get validateButton() {
    return this.page.getByRole('button', { name: /验证/i });
  }

  get analyzeButton() {
    return this.page.getByRole('button', { name: /开始分析/i });
  }

  get projectInfoCard() {
    return this.page.getByText(/项目信息预览/i);
  }

  get stepSelector() {
    return this.page.getByText(/选择分析步骤/i);
  }

  // 操作方法
  async enterProjectPath(path: string) {
    await this.projectPathInput.fill(path);
  }

  async validateProject() {
    await this.validateButton.click();
  }

  async selectStep(stepName: string) {
    await this.page.getByText(stepName).click();
  }

  async selectAllSteps() {
    await this.page.getByLabel(/全选/i).click();
  }

  async startAnalysis() {
    await this.analyzeButton.click();
  }

  async submitAnalysisProject(path: string) {
    await this.enterProjectPath(path);
    await this.validateProject();
    await this.page.waitForTimeout(1000); // 等待项目验证完成
    await this.startAnalysis();
  }
}

/**
 * 视频历史纪录页面对象模型
 */
export class HistoryPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/history');
  }

  // 元素选择器
  get taskTable() {
    return this.page.getByRole('table');
  }

  get taskRows() {
    return this.taskTable.getByRole('row');
  }

  // 操作方法
  async viewTask(taskIndex: number = 0) {
    const viewButtons = this.page.getByRole('button', { name: /查看/i });
    await viewButtons.nth(taskIndex).click();
  }

  async deleteTask(taskIndex: number = 0) {
    const deleteButtons = this.page.getByRole('button', { name: /删除/i });
    await deleteButtons.nth(taskIndex).click();
    // 确认删除
    await this.page.getByText(/确定删除吗/).click();
  }
}

/**
 * 分析历史纪录页面对象模型
 */
export class AnalysisHistoryPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/analysis-history');
  }

  // 元素选择器
  get taskTable() {
    return this.page.getByRole('table');
  }

  get refreshButton() {
    return this.page.getByRole('button', { name: /刷新/i });
  }

  // 操作方法
  async refresh() {
    await this.refreshButton.click();
  }

  async viewTask(taskIndex: number = 0) {
    const viewButtons = this.page.getByRole('button', { name: /查看/i });
    await viewButtons.nth(taskIndex).click();
  }

  async deleteTask(taskIndex: number = 0) {
    const deleteButtons = this.page.getByRole('button', { name: /删除/i }).nth(taskIndex);
    await deleteButtons.click();
    // 确认删除
    await this.page.getByText(/确定删除吗/).click();
  }
}
