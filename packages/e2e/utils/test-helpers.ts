import { Page, Locator } from '@playwright/test';

/**
 * 常用测试工具函数
 */

/**
 * 等待 Toast 消息出现
 * @param page Playwright page 对象
 * @param message 期望的 toast 消息文本
 * @param options 配置选项
 */
export async function waitForToast(
  page: Page,
  message: string | RegExp,
  options?: { timeout?: number }
) {
  const toastSelector = page.getByText(message);
  await toastSelector.waitFor({ timeout: options?.timeout || 5000 });
  return toastSelector;
}

/**
 * 等待并确认删除操作
 * @param page Playwright page 对象
 */
export async function confirmDelete(page: Page) {
  const confirmButton = page.getByRole('button', { name: /确定/i });
  await confirmButton.click();
}

/**
 * 获取表格行数据
 * @param tableLocator 表格定位器
 * @returns 表格行数据数组
 */
export async function getTableRows(tableLocator: Locator) {
  const rows = tableLocator.getByRole('row');
  const rowCount = await rows.count();
  const rowData: string[][] = [];

  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const cells = row.getByRole('cell');
    const cellCount = await cells.count();
    const row_data: string[] = [];

    for (let j = 0; j < cellCount; j++) {
      const cellText = await cells.nth(j).textContent();
      row_data.push(cellText || '');
    }

    rowData.push(row_data);
  }

  return rowData;
}

/**
 * 等待页面加载完成
 * @param page Playwright page 对象
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * 截图用于调试
 * @param page Playwright page 对象
 * @param name 截图名称
 */
export async function debugScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `playwright-report/debug/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * 等待元素出现
 * @param element Locator 元素
 * @param options 配置选项
 */
export async function waitForElement(
  element: Locator,
  options?: { timeout?: number; visible?: boolean }
) {
  await element.waitFor({
    state: options?.visible ? 'visible' : 'attached',
    timeout: options?.timeout || 5000,
  });
}

/**
 * 模拟文件上传
 * @param page Playwright page 对象
 * @param inputLocator 文件输入定位器
 * @param filePath 文件路径
 */
export async function uploadFile(page: Page, inputLocator: Locator, filePath: string) {
  await inputLocator.setInputFiles(filePath);
}

/**
 * 清除 IndexedDB 数据
 * @param page Playwright page 对象
 */
export async function clearIndexedDB(page: Page) {
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('videomemo-db');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  });
}

/**
 * 清除本地存储
 * @param page Playwright page 对象
 */
export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * 完全清除浏览器存储
 * @param page Playwright page 对象
 */
export async function clearAllStorage(page: Page) {
  await clearLocalStorage(page);
  await clearIndexedDB(page);
}
