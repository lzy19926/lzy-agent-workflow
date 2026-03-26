import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import {
  CodeAnalysisService,
  type HookConfig,
  type HookEvent,
  type AnalysisTask,
  CODE_ANALYSIS_DEFAULT_CONFIG as DEFAULT_CONFIG,
} from '@videomemo/core';
import { sendSSE } from './events-service';

/**
 * 后端分析服务配置
 */
interface AnalysisServiceConfig {
  outputDir?: string;
  skillsSourceDir?: string;
  stepTimeout?: number;
}

/**
 * 后端分析服务
 * 负责任务管理：创建、删除、查询、状态更新
 * 使用 CodeAnalysisService 执行单个分析任务
 *
 * 使用示例：
 * ```typescript
 * const analysisService = new AnalysisService();
 *
 * // 创建任务
 * const task = await analysisService.createTask(projectPath);
 *
 * // 查询任务
 * const task = await analysisService.getTask(taskId);
 *
 * // 删除任务
 * await analysisService.deleteTask(taskId);
 *
 * // 获取任务列表
 * const tasks = await analysisService.getTaskList();
 * ```
 */
export class AnalysisService {
  private outputDir: string;
  private skillsSourceDir: string;
  private stepTimeout: number;

  // 内存中的任务存储
  private tasks: Map<string, AnalysisTask> = new Map();
  private runningTasks: Set<string> = new Set();

  constructor(config?: AnalysisServiceConfig) {
    this.outputDir = path.resolve(config?.outputDir || DEFAULT_CONFIG.outputDir);
    this.skillsSourceDir = path.resolve(config?.skillsSourceDir || DEFAULT_CONFIG.skillsSourceDir);
    this.stepTimeout = config?.stepTimeout || DEFAULT_CONFIG.stepTimeout;

    console.log('[AnalysisService] outputDir:', this.outputDir);
    console.log('[AnalysisService] skillsSourceDir:', this.skillsSourceDir);
  }

  /**
   * 创建 SSE Hook 配置
   */
  private createSSEHooks(taskId: string): HookConfig {
    const updateTask = (updates: Partial<AnalysisTask>) => {
      const task = this.tasks.get(taskId);
      if (task) {
        this.tasks.set(taskId, { ...task, ...updates });
      }
    };

    const hooks: HookConfig = {
      onTaskStart: async () => {
        updateTask({ status: 'running', progress: 5, currentStep: '检查 Claude CLI...' });
        sendSSE(taskId, {
          type: 'task_start',
          taskId,
          data: { message: '任务开始执行' },
        });
      },

      onTaskComplete: async (event) => {
        updateTask({
          status: 'completed',
          progress: 100,
          currentStep: undefined,
          completedAt: new Date().toISOString(),
        });
        sendSSE(taskId, {
          type: 'task_complete',
          taskId,
          data: event.data,
        });
        this.runningTasks.delete(taskId);
      },

      onTaskError: async (event) => {
        updateTask({
          status: 'failed',
          error: event.data?.error,
          currentStep: undefined,
        });
        sendSSE(taskId, {
          type: 'task_error',
          taskId,
          data: event.data,
        });
        this.runningTasks.delete(taskId);
      },

      onSkillRegistered: async () => {
        updateTask({ progress: 10, currentStep: '注册分析 skills...' });
        sendSSE(taskId, {
          type: 'skill_registered',
          taskId,
          data: { message: '所有 skills 已注册到项目' },
        });
      },

      onBatchStart: async (event) => {
        updateTask({ progress: 20, currentStep: `执行分析步骤 (并行)...` });
        sendSSE(taskId, {
          type: 'batch_start',
          taskId,
          data: event.data,
        });
      },

      onBatchComplete: async (event) => {
        updateTask({
          progress: 80,
          currentStep: `并行步骤完成 (${event.data?.successCount}/${event.data?.total})`,
        });
        sendSSE(taskId, {
          type: 'batch_complete',
          taskId,
          data: event.data,
        });
      },

      onStepStart: async (event) => {
        sendSSE(taskId, {
          type: 'step_start',
          taskId,
          data: {
            stepId: event.stepId,
            stepKey: event.stepKey,
            stepName: event.stepName,
          },
        });
      },

      onStepComplete: async (event) => {
        updateTask({
          currentStep: `完成步骤 ${event.stepId}: ${event.stepName}`,
        });
        sendSSE(taskId, {
          type: 'step_complete',
          taskId,
          data: event.data,
        });
      },

      onStepError: async (event) => {
        sendSSE(taskId, {
          type: 'step_error',
          taskId,
          data: event.data,
        });
      },

      onGeneratingSummary: async () => {
        updateTask({ progress: 90, currentStep: '生成汇总报告...' });
        sendSSE(taskId, {
          type: 'generating_summary',
          taskId,
        });
      },

      onSummaryComplete: async () => {
        sendSSE(taskId, {
          type: 'summary_complete',
          taskId,
        });
      },
    };

    return hooks;
  }

  /**
   * 创建分析任务
   * @param projectPath 项目路径
   * @param selectedStepKeys 选择的步骤 key 列表
   */
  async createTask(projectPath: string, selectedStepKeys?: string[]): Promise<AnalysisTask> {
    // 检查是否已有相同路径的任务在运行
    for (const [, task] of this.tasks) {
      if (task.projectPath === projectPath && task.status === 'running') {
        return task;
      }
    }

    const taskId = uuidv4();
    const task: AnalysisTask = {
      id: taskId,
      status: 'pending',
      progress: 0,
      projectPath,
      projectName: path.basename(projectPath),
      createdAt: new Date().toISOString(),
    };

    this.tasks.set(taskId, task);
    this.runningTasks.add(taskId);

    // 创建 SSE Hooks
    const sseHooks = this.createSSEHooks(taskId);

    // 创建执行器并执行分析
    const executor = new CodeAnalysisService(
      {
        outputDir: this.outputDir,
        skillsSourceDir: this.skillsSourceDir,
        stepTimeout: this.stepTimeout,
      },
      sseHooks
    );

    // 异步执行，不阻塞返回
    executor.execute(taskId, projectPath, selectedStepKeys).catch((error) => {
      console.error('[AnalysisService] Analysis execution error:', error);
    });

    return task;
  }

  /**
   * 获取任务
   */
  async getTask(taskId: string): Promise<AnalysisTask | undefined> {
    return this.tasks.get(taskId);
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }
    this.tasks.delete(taskId);
    return true;
  }

  /**
   * 获取任务列表
   */
  async getTaskList(): Promise<AnalysisTask[]> {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * 验证项目目录
   */
  async validateProject(projectPath: string): Promise<any> {
    const executor = new CodeAnalysisService({
      outputDir: this.outputDir,
      skillsSourceDir: this.skillsSourceDir,
      stepTimeout: this.stepTimeout,
    });
    return executor.validateProject(projectPath);
  }

  /**
   * 获取报告
   */
  async getReport(taskId: string, reportName?: string): Promise<string | null> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'completed') {
      return null;
    }

    const fs = await import('fs/promises');
    const projectName = task.projectName || taskId;
    const reportPath = reportName
      ? path.join(this.outputDir, projectName, reportName)
      : path.join(this.outputDir, projectName, 'summary.md');

    try {
      return await fs.readFile(reportPath, 'utf-8');
    } catch (error) {
      console.error('[AnalysisService] Failed to read report:', error);
      return null;
    }
  }

  /**
   * 获取报告列表
   */
  async getReportList(taskId: string): Promise<string[]> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return [];
    }

    const fs = await import('fs/promises');
    const projectDir = path.join(this.outputDir, task.projectName || taskId);
    try {
      const files = await fs.readdir(projectDir);
      return files.filter((f) => f.endsWith('.md')).sort();
    } catch (error) {
      console.error('[AnalysisService] Failed to read report list:', error);
      return [];
    }
  }
}
