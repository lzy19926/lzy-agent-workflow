import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { ClaudeCode } from '@videomemo/core';
import { sendSSE } from './events-service';

export interface AnalysisTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  projectPath: string;
  projectName?: string;
  currentStep?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ProjectInfo {
  name: string;
  path: string;
  language: string;
  framework?: string;
  fileCount: number;
  techStack: string[];
}

export interface ValidateResult {
  valid: boolean;
  info?: ProjectInfo;
  error?: string;
}

// 分析步骤配置（用于前端展示）
export interface AnalysisStepConfig {
  id: number;
  name: string;
  key: string;
  description: string;
  skill?: string;
}

// 内部使用的完整步骤定义
interface AnalysisStep extends AnalysisStepConfig {
  prompt: string;
  outputPrefix: string;
}

// 导出 ANALYSIS_STEPS 常量供前端使用
export const ANALYSIS_STEPS: AnalysisStep[] = [
  {
    id: 1,
    name: '架构分析',
    key: 'architecture_analysis',
    description: '项目整体架构分析',
    skill: 'architecture-analysis',
    prompt: '使用 skill: architecture-analysis 对该项目进行整体架构分析',
    outputPrefix: '01-architecture-analysis',
  },
  {
    id: 2,
    name: '功能分析',
    key: 'feature_analysis',
    description: '主要功能点代码实现分析',
    skill: 'architecture-analysis',
    prompt: '使用 skill: architecture-analysis 对项目进行功能分析，说明各主要功能点的代码实现',
    outputPrefix: '02-feature-analysis',
  },
  {
    id: 3,
    name: '前端安全性分析',
    key: 'security_analysis',
    description: '前端安全性检查',
    skill: 'frontend-mobile-security-xss-scan',
    prompt: '使用 skill: frontend-mobile-security-xss-scan 检查项目 src 下的文件，分析前端安全性',
    outputPrefix: '03-security-analysis',
  },
  {
    id: 4,
    name: '代码质量分析',
    key: 'code_quality',
    description: '代码质量与编码规范检查',
    skill: 'coding-standards',
    prompt: '使用 skill: coding-standards 检查项目的代码质量与编码规范，包含 TypeScript 类型体系质量',
    outputPrefix: '04-code-quality',
  },
  {
    id: 5,
    name: '性能分析',
    key: 'performance_analysis',
    description: '项目性能分析',
    skill: undefined,
    prompt: '对项目的性能进行分析，总结问题、优缺点、技术思路',
    outputPrefix: '05-performance-analysis',
  },
  {
    id: 6,
    name: '代码逐行审查',
    key: 'code_review',
    description: '代码逐行审查，整理优缺点',
    skill: 'audit-context-building',
    prompt: '使用 skill: audit-context-building 对项目代码做逐行审查，将优点和缺点整理成两个独立的章节',
    outputPrefix: '06-code-review',
  },
  {
    id: 7,
    name: '重构与改进建议',
    key: 'refactor_suggestions',
    description: '生成问题、风险点、改进建议报告',
    skill: undefined,
    prompt: '基于先前步骤生成的项目文档，生成一份当前项目问题、风险点、改进建议的报告',
    outputPrefix: '07-refactor-suggestions',
  },
];

// 导出获取分析步骤配置的函数
export function getAnalysisSteps(): AnalysisStepConfig[] {
  return ANALYSIS_STEPS.map(({ id, name, key, description, skill }) => ({
    id,
    name,
    key,
    description,
    skill,
  }));
}

// 内存中的任务存储
const tasks: Map<string, AnalysisTask> = new Map();
const runningTasks: Set<string> = new Set();

export class AnalysisService {
  private outputDir: string;
  private skillsSourceDir: string;

  constructor() {
    // 从环境变量读取 outputDir，默认使用 '../output/analysis'
    const outputDirEnv = path.join('../../', 'output', 'analysis');
    this.outputDir = path.resolve(outputDirEnv);
    this.skillsSourceDir = path.join(
      process.cwd(),
      '..',
      'core',
      'src',
      'skills',
      'lzy_ts_code_analyzer'
    );
    console.log('[AnalysisService] outputDir:', this.outputDir);
  }

  // 创建分析任务
  async createTask(projectPath: string, selectedStepKeys?: string[]): Promise<AnalysisTask> {
    // 检查是否已有相同路径的任务在运行
    for (const [_, task] of tasks) {
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

    tasks.set(taskId, task);

    // 异步执行分析
    this.executeAnalysisWithClaude(taskId, projectPath, selectedStepKeys).catch((error) => {
      console.error('Analysis execution error:', error);
    });

    return task;
  }

  // 获取任务
  async getTask(taskId: string): Promise<AnalysisTask | undefined> {
    return tasks.get(taskId);
  }

  // 删除任务
  async deleteTask(taskId: string): Promise<boolean> {
    const task = tasks.get(taskId);
    if (!task) {
      return false;
    }
    tasks.delete(taskId);
    return true;
  }

  // 获取任务列表
  async getTaskList(): Promise<AnalysisTask[]> {
    return Array.from(tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // 获取报告
  async getReport(taskId: string, reportName?: string): Promise<string | null> {
    const task = tasks.get(taskId);
    if (!task || task.status !== 'completed') {
      return null;
    }

    const projectName = task.projectName || taskId;
    const reportPath = reportName
      ? path.join(this.outputDir, projectName, reportName)
      : path.join(this.outputDir, projectName, 'report.md');

    try {
      return await fs.readFile(reportPath, 'utf-8');
    } catch (error) {
      console.error('Failed to read report:', error);
      return null;
    }
  }

  // 获取所有报告列表
  async getReportList(taskId: string): Promise<string[]> {
    const task = tasks.get(taskId);
    if (!task) {
      return [];
    }

    const projectDir = path.join(this.outputDir, task.projectName || taskId);
    try {
      const files = await fs.readdir(projectDir);
      return files.filter((f) => f.endsWith('.md')).sort();
    } catch (error) {
      console.error('Failed to read report list:', error);
      return [];
    }
  }

  // 验证项目目录
  async validateProject(projectPath: string): Promise<ValidateResult> {
    try {
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        return { valid: false, error: '路径不是目录' };
      }

      const items = await fs.readdir(projectPath, { withFileTypes: true });

      const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp'];
      const configFiles = ['package.json', 'tsconfig.json', 'pom.xml', 'build.gradle', 'Cargo.toml', 'go.mod', 'requirements.txt'];

      let codeFileCount = 0;
      let foundConfig = false;
      const detectedLanguages = new Set<string>();
      const techStack = new Set<string>();

      for (const item of items) {
        if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          const name = item.name.toLowerCase();

          if (codeExtensions.includes(ext)) {
            codeFileCount++;
            switch (ext) {
              case '.ts':
              case '.tsx':
                detectedLanguages.add('TypeScript');
                break;
              case '.js':
              case '.jsx':
                detectedLanguages.add('JavaScript');
                break;
              case '.py':
                detectedLanguages.add('Python');
                break;
              case '.java':
                detectedLanguages.add('Java');
                break;
              case '.go':
                detectedLanguages.add('Go');
                break;
              case '.rs':
                detectedLanguages.add('Rust');
                break;
            }
          }

          if (configFiles.includes(name)) {
            foundConfig = true;
            if (name === 'package.json') {
              techStack.add('Node.js');
              try {
                const packageJsonPath = path.join(projectPath, 'package.json');
                const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
                const packageJson = JSON.parse(packageJsonContent);
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

                if (deps.react) techStack.add('React');
                if (deps.vue) techStack.add('Vue');
                if (deps['react-router'] || deps['react-router-dom']) techStack.add('React Router');
                if (deps.next) techStack.add('Next.js');
                if (deps.nuxt) techStack.add('Nuxt.js');
                if (deps.express) techStack.add('Express');
                if (deps.fastify) techStack.add('Fastify');
                if (deps.antd) techStack.add('Ant Design');
                if (deps.tailwindcss) techStack.add('Tailwind CSS');
              } catch (e) {
                // 忽略解析错误
              }
            } else if (name === 'tsconfig.json') {
              techStack.add('TypeScript');
            } else if (name === 'requirements.txt') {
              techStack.add('Python');
            } else if (name === 'Cargo.toml') {
              techStack.add('Rust');
            } else if (name === 'go.mod') {
              techStack.add('Go');
            }
          }
        }
      }

      if (codeFileCount === 0 && !foundConfig) {
        return {
          valid: false,
          error: '未检测到代码文件，请选择有效的代码工程项目目录',
        };
      }

      const languages = Array.from(detectedLanguages);
      const primaryLanguage = languages[0] || 'Unknown';

      return {
        valid: true,
        info: {
          name: path.basename(projectPath),
          path: projectPath,
          language: primaryLanguage,
          fileCount: codeFileCount,
          techStack: Array.from(techStack),
          framework:
            techStack.has('React')
              ? 'React'
              : techStack.has('Vue')
                ? 'Vue'
                : techStack.has('Next.js')
                  ? 'Next.js'
                  : techStack.has('Express')
                    ? 'Express'
                    : undefined,
        },
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.code === 'ENOENT' ? '路径不存在' : error.message,
      };
    }
  }

  // 注册所有 skills 到目标项目
  private async registerSkills(projectPath: string): Promise<void> {
    const claude = new ClaudeCode();

    // 获取 skills 源目录下的所有子目录（每个 skill 一个目录）
    const skillDirs = await fs.readdir(this.skillsSourceDir, { withFileTypes: true });

    for (const dir of skillDirs) {
      if (dir.isDirectory()) {
        const skillPath = path.join(this.skillsSourceDir, dir.name);
        const result = await claude.registerSkill(skillPath, projectPath);

        if (result.success) {
          console.log(`Skill registered: ${result.name} -> ${result.targetPath}`);
        } else {
          console.warn(`Failed to register skill ${result.name}: ${result.error}`);
        }
      }
    }
  }

  // 使用 Claude Code 执行分析
  private async executeAnalysisWithClaude(taskId: string, projectPath: string, selectedStepKeys?: string[]): Promise<void> {
    // 检查是否有其他任务正在运行
    if (runningTasks.size > 0) {
      this.updateTask(taskId, { status: 'pending', progress: 0, currentStep: '等待其他任务完成...' });

      while (runningTasks.size > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    runningTasks.add(taskId);

    try {
      // 步骤 0: 检查 Claude CLI 可用性
      this.updateTask(taskId, {
        status: 'running',
        progress: 5,
        currentStep: '检查 Claude CLI...',
      });

      if (!ClaudeCode.isAvailable()) {
        throw new Error('Claude CLI 未安装或未配置，请先安装：npm install -g @anthropic-ai/claude-code');
      }

      // 步骤 1: 注册 skills
      this.updateTask(taskId, {
        progress: 10,
        currentStep: '注册分析 skills...',
      });

      await this.registerSkills(projectPath);
      sendSSE(taskId, {
        type: 'skill_registered',
        taskId,
        data: { message: '所有 skills 已注册到项目' },
      });

      // 步骤 2: 初始化输出目录
      this.updateTask(taskId, {
        progress: 15,
        currentStep: '初始化输出目录...',
      });

      const projectOutputDir = path.join(this.outputDir, path.basename(projectPath));
      await fs.mkdir(projectOutputDir, { recursive: true });

      // 步骤 3: 先与 Claude 建立连接，发送测试消息
      this.updateTask(taskId, {
        progress: 18,
        currentStep: '连接 Claude Code...',
      });

      sendSSE(taskId, {
        type: 'connecting_claude',
        taskId,
        data: { message: '正在与 Claude 建立连接...' },
      });

      const claude = new ClaudeCode();

      // 先进行测试命令 - 等待输出结果
      try {
        this.updateTask(taskId, {
          progress: 19,
          currentStep: '发送测试消息...',
        });

        console.log('[Analysis] 发送 Claude 测试消息...');
        const testOutputFile = path.join(projectOutputDir, `响应测试.md`);
        const testResult = await claude.run(projectPath, '你好', {
          outputFile: testOutputFile,
        });
        console.log('[Analysis] Claude 测试响应:', testResult.substring(0, 200));
      } catch (testError: any) {
        console.error('[Analysis] Claude 连接测试失败:', testError.message);
        // 测试失败不中断流程，继续执行
      }

      // 根据选择的步骤执行分析
      const stepsToExecute = selectedStepKeys
        ? ANALYSIS_STEPS.filter(step => selectedStepKeys.includes(step.key))
        : ANALYSIS_STEPS; // 默认执行所有步骤

      if (stepsToExecute.length === 0) {
        throw new Error('未选择任何分析步骤');
      }

      // 检查是否有依赖步骤（第 7 步需要前面的步骤结果）
      const hasRefactorStep = stepsToExecute.some(s => s.key === 'refactor_suggestions');
      const hasPreviousSteps = stepsToExecute.some(s => s.id >= 1 && s.id <= 6);

      if (hasRefactorStep && !hasPreviousSteps) {
        throw new Error('重构与改进建议需要至少一个分析步骤的结果');
      }

      // 分离并行步骤和顺序步骤
      // 并行执行步骤 1-6，步骤 7 必须单独执行（依赖前面结果）
      const parallelSteps = stepsToExecute.filter(s => s.id >= 1 && s.id <= 6);
      const sequentialSteps = stepsToExecute.filter(s => s.id === 7);

      const totalSteps = stepsToExecute.length;
      let completedSteps = 0;

      if (parallelSteps.length > 0) {
        this.updateTask(taskId, {
          progress: 20,
          currentStep: `执行分析步骤 (1-${parallelSteps.length}并行)...`,
        });

        sendSSE(taskId, {
          type: 'batch_start',
          taskId,
          data: { batchName: '分析步骤', steps: parallelSteps.map(s => s.name) },
        });

        // 并行执行步骤
        const parallelPromises = parallelSteps.map(async (step) => {
          sendSSE(taskId, {
            type: 'step_start',
            taskId,
            data: { stepId: step.id, stepKey: step.key, stepName: step.name },
          });

          try {
            const fullPrompt = `${step.prompt}。请将分析报告以 Markdown 格式输出。`;
            const stepOutputPath = path.join(
              projectOutputDir,
              `${step.name}.md`
            );

            console.log(`[Analysis] 执行步骤 ${step.id}: ${step.name}`);
            await claude.run(projectPath, fullPrompt, {
              timeout: 10 * 60 * 1000,
              outputFile: stepOutputPath,
            });

            console.log(`[Analysis] 步骤 ${step.id} 完成，报告已保存：${stepOutputPath}`);

            // 读取生成的文档内容
            let content = '';
            try {
              content = await fs.readFile(stepOutputPath, 'utf-8');
            } catch (readError) {
              console.error(`Failed to read step output: ${stepOutputPath}`, readError);
            }

            completedSteps++;
            const stepProgress = 20 + (completedSteps / totalSteps) * 60;

            this.updateTask(taskId, {
              progress: Math.round(stepProgress),
              currentStep: `完成步骤 ${step.id}: ${step.name}`,
            });

            sendSSE(taskId, {
              type: 'step_complete',
              taskId,
              data: {
                stepId: step.id,
                stepKey: step.key,
                stepName: step.name,
                outputPath: stepOutputPath,
                content: content,
              },
            });

            return { success: true, step };
          } catch (stepError: any) {
            console.error(`Step ${step.name} failed:`, stepError.message);
            sendSSE(taskId, {
              type: 'step_error',
              taskId,
              data: { stepId: step.id, stepKey: step.key, stepName: step.name, error: stepError.message },
            });
            return { success: false, step, error: stepError.message };
          }
        });

        // 等待所有并行步骤完成
        const parallelResults = await Promise.all(parallelPromises);
        const successCount = parallelResults.filter(r => r.success).length;
        console.log(`[Analysis] 并行步骤完成：${successCount}/${parallelSteps.length} 成功`);

        if (sequentialSteps.length > 0) {
          this.updateTask(taskId, {
            progress: 80,
            currentStep: `并行步骤完成 (${successCount}/${parallelSteps.length})，执行后续步骤...`,
          });
        }
      }

      // 执行顺序步骤（第 7 步：重构与改进建议）
      for (const step of sequentialSteps) {
        try {
          const fullPrompt = `${step.prompt}。请将分析报告以 Markdown 格式输出。`;
          const stepOutputPath = path.join(
            projectOutputDir,
            `${step.name}.md`
          );

          console.log(`[Analysis] 执行步骤 ${step.id}: ${step.name}`);
          await claude.run(projectPath, fullPrompt, {
            timeout: 10 * 60 * 1000,
            outputFile: stepOutputPath,
          });

          console.log(`[Analysis] 步骤 ${step.id} 完成，报告已保存：${stepOutputPath}`);

          // 读取生成的文档内容
          let content = '';
          try {
            content = await fs.readFile(stepOutputPath, 'utf-8');
          } catch (readError) {
            console.error(`Failed to read step output: ${stepOutputPath}`, readError);
          }

          completedSteps++;
          const stepProgress = 20 + (completedSteps / totalSteps) * 60;

          this.updateTask(taskId, {
            progress: Math.round(stepProgress),
            currentStep: `完成步骤 ${step.id}: ${step.name}`,
          });

          sendSSE(taskId, {
            type: 'step_complete',
            taskId,
            data: {
              stepId: step.id,
              stepKey: step.key,
              stepName: step.name,
              outputPath: stepOutputPath,
              content: content,
            },
          });
        } catch (stepError: any) {
          console.error(`Step ${step.name} failed:`, stepError.message);
          sendSSE(taskId, {
            type: 'step_error',
            taskId,
            data: { stepId: step.id, stepKey: step.key, stepName: step.name, error: stepError.message },
          });
        }
      }

      // 生成汇总报告
      this.updateTask(taskId, {
        progress: 90,
        currentStep: '生成汇总报告...',
      });

      sendSSE(taskId, {
        type: 'generating_summary',
        taskId,
      });

      const summaryReport = await this.generateSummaryReport(projectOutputDir);
      const summaryPath = path.join(projectOutputDir, 'summary.md');
      await fs.writeFile(summaryPath, summaryReport);

      // 完成
      this.updateTask(taskId, {
        status: 'completed',
        progress: 100,
        currentStep: undefined,
        completedAt: new Date().toISOString(),
      });

      sendSSE(taskId, {
        type: 'analysis_complete',
        taskId,
        data: { reportDir: projectOutputDir },
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      this.updateTask(taskId, {
        status: 'failed',
        error: error.message,
        currentStep: undefined,
      });

      sendSSE(taskId, {
        type: 'analysis_error',
        taskId,
        data: { error: error.message },
      });

      throw error;
    } finally {
      runningTasks.delete(taskId);
    }
  }

  // 生成汇总报告
  private async generateSummaryReport(projectOutputDir: string): Promise<string> {
    const files = await fs.readdir(projectOutputDir);
    const mdFiles = files.filter((f) => f.endsWith('.md') && f !== 'summary.md');

    let summary = `# 代码分析报告汇总\n\n`;
    summary += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;
    summary += `## 报告列表\n\n`;

    for (const file of mdFiles.sort()) {
      const stepName = file.replace(/\.md$/, '');
      summary += `- ${stepName}: \`${file}\`\n`;
    }

    summary += `\n## 各步骤详细分析\n\n`;

    // 读取每个报告的前 500 字符作为摘要
    for (const file of mdFiles.sort()) {
      const filePath = path.join(projectOutputDir, file);
      const stepName = file.replace(/\.md$/, '');
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const preview = content.substring(0, 500).replace(/\n+/g, ' ');
        summary += `### ${stepName}\n\n${preview}...\n\n`;
      } catch (error) {
        summary += `### ${file}\n\n[读取失败]\n\n`;
      }
    }

    return summary;
  }

  // 生成时间戳
  private generateTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }

  // 更新任务状态
  private updateTask(taskId: string, updates: Partial<AnalysisTask>): void {
    const task = tasks.get(taskId);
    if (task) {
      const updatedTask = { ...task, ...updates };
      tasks.set(taskId, updatedTask);

      // 通过 SSE 推送任务状态更新
      sendSSE(taskId, {
        type: 'task_update',
        taskId,
        data: updatedTask,
      });
    }
  }
}
