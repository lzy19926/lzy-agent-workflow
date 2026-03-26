import fs from "fs/promises"
import path from "path"
import { ClaudeCode } from "../tools/claude-code"
import { ANALYSIS_STEPS } from "./types"
import type {
  AnalysisStepConfig,
  ValidateResult,
  HookConfig,
  HookEvent,
} from "./types"

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
  outputDir: "../output/analysis",
  skillsSourceDir: path.join(__dirname, "../../src/skills/lzy_ts_code_analyzer"),
  stepTimeout: 5 * 60 * 1000, // 10 分钟
}

/**
 * 获取分析步骤配置（独立函数）
 */
export function getAnalysisSteps(): AnalysisStepConfig[] {
  return ANALYSIS_STEPS.map(({ id, name, key, description, skill }) => ({
    id,
    name,
    key,
    description,
    skill,
  }))
}

/**
 * 代码分析执行器
 *
 * 负责执行单个代码分析任务，通过 Hook 机制传递执行状态
 * 不负责任务管理，任务管理由调用方负责
 *
 * 使用示例：
 * ```typescript
 * const service = new CodeAnalysisService({ hooks: { onStepStart, onStepComplete, ... } });
 * await service.execute({ taskId, projectPath, selectedStepKeys });
 * ```
 */
export class CodeAnalysisService {
  private outputDir: string
  private skillsSourceDir: string
  private stepTimeout: number
  private hooks: HookConfig

  constructor(config?: Partial<typeof DEFAULT_CONFIG>, hooks?: HookConfig) {
    const resolvedConfig = { ...DEFAULT_CONFIG, ...config }

    this.outputDir = path.resolve(resolvedConfig.outputDir)
    this.skillsSourceDir = path.resolve(resolvedConfig.skillsSourceDir)
    this.stepTimeout = resolvedConfig.stepTimeout
    this.hooks = hooks || {}
  }

  /**
   * 触发 Hook
   */
  private async triggerHook(event: HookEvent): Promise<void> {
    const hookMap: Record<HookEvent["type"], keyof HookConfig | undefined> = {
      task_start: "onTaskStart",
      task_complete: "onTaskComplete",
      task_error: "onTaskError",
      skill_registered: "onSkillRegistered",
      step_start: "onStepStart",
      step_complete: "onStepComplete",
      step_error: "onStepError",
      batch_start: "onBatchStart",
      batch_complete: "onBatchComplete",
      generating_summary: "onGeneratingSummary",
      summary_complete: "onSummaryComplete",
    }

    const hookKey = hookMap[event.type]
    if (hookKey) {
      const hook = this.hooks[hookKey]
      if (hook) {
        try {
          await hook(event)
        } catch (error) {
          console.error(
            `[CodeAnalysisExecutor] Hook ${event.type} error:`,
            error
          )
        }
      }
    }
  }

  /**
   * 验证项目目录
   */
  async validateProject(projectPath: string): Promise<ValidateResult> {
    try {
      const stats = await fs.stat(projectPath)
      if (!stats.isDirectory()) {
        return { valid: false, error: "路径不是目录" }
      }

      const items = await fs.readdir(projectPath, { withFileTypes: true })

      const codeExtensions = [
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".py",
        ".java",
        ".go",
        ".rs",
        ".c",
        ".cpp",
        ".h",
        ".hpp",
      ]
      const configFiles = [
        "package.json",
        "tsconfig.json",
        "pom.xml",
        "build.gradle",
        "Cargo.toml",
        "go.mod",
        "requirements.txt",
      ]

      let codeFileCount = 0
      let foundConfig = false
      const detectedLanguages = new Set<string>()
      const techStack = new Set<string>()

      for (const item of items) {
        if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase()
          const name = item.name.toLowerCase()

          if (codeExtensions.includes(ext)) {
            codeFileCount++
            switch (ext) {
              case ".ts":
              case ".tsx":
                detectedLanguages.add("TypeScript")
                break
              case ".js":
              case ".jsx":
                detectedLanguages.add("JavaScript")
                break
              case ".py":
                detectedLanguages.add("Python")
                break
              case ".java":
                detectedLanguages.add("Java")
                break
              case ".go":
                detectedLanguages.add("Go")
                break
              case ".rs":
                detectedLanguages.add("Rust")
                break
            }
          }

          if (configFiles.includes(name)) {
            foundConfig = true
            if (name === "package.json") {
              techStack.add("Node.js")
              try {
                const packageJsonPath = path.join(projectPath, "package.json")
                const packageJsonContent = await fs.readFile(
                  packageJsonPath,
                  "utf-8"
                )
                const packageJson = JSON.parse(packageJsonContent)
                const deps = {
                  ...packageJson.dependencies,
                  ...packageJson.devDependencies,
                }

                if (deps.react) techStack.add("React")
                if (deps.vue) techStack.add("Vue")
                if (deps["react-router"] || deps["react-router-dom"])
                  techStack.add("React Router")
                if (deps.next) techStack.add("Next.js")
                if (deps.nuxt) techStack.add("Nuxt.js")
                if (deps.express) techStack.add("Express")
                if (deps.fastify) techStack.add("Fastify")
                if (deps.antd) techStack.add("Ant Design")
                if (deps.tailwindcss) techStack.add("Tailwind CSS")
              } catch {
                // 忽略解析错误
              }
            } else if (name === "tsconfig.json") {
              techStack.add("TypeScript")
            } else if (name === "requirements.txt") {
              techStack.add("Python")
            } else if (name === "Cargo.toml") {
              techStack.add("Rust")
            } else if (name === "go.mod") {
              techStack.add("Go")
            }
          }
        }
      }

      if (codeFileCount === 0 && !foundConfig) {
        return {
          valid: false,
          error: "未检测到代码文件，请选择有效的代码工程项目目录",
        }
      }

      const languages = Array.from(detectedLanguages)
      const primaryLanguage = languages[0] || "Unknown"

      return {
        valid: true,
        info: {
          name: path.basename(projectPath),
          path: projectPath,
          language: primaryLanguage,
          fileCount: codeFileCount,
          techStack: Array.from(techStack),
          framework: techStack.has("React")
            ? "React"
            : techStack.has("Vue")
            ? "Vue"
            : techStack.has("Next.js")
            ? "Next.js"
            : techStack.has("Express")
            ? "Express"
            : undefined,
        },
      }
    } catch (error: any) {
      return {
        valid: false,
        error: error.code === "ENOENT" ? "路径不存在" : error.message,
      }
    }
  }

  /**
   * 注册 skills 到目标项目
   */
  private async registerSkills(projectPath: string): Promise<void> {
    const claude = new ClaudeCode()

    const skillDirs = await fs.readdir(this.skillsSourceDir, {
      withFileTypes: true,
    })

    for (const dir of skillDirs) {
      if (dir.isDirectory()) {
        const skillPath = path.join(this.skillsSourceDir, dir.name)
        const result = await claude.registerSkill(skillPath, projectPath)

        if (result.success) {
          console.log(
            `[CodeAnalysisExecutor] Skill registered: ${result.name} -> ${result.targetPath}`
          )
        } else {
          console.warn(
            `[CodeAnalysisExecutor] Failed to register skill ${result.name}: ${result.error}`
          )
        }
      }
    }
  }

  /**
   * 生成汇总报告
   */
  private async generateSummaryReport(
    projectOutputDir: string
  ): Promise<string> {
    const files = await fs.readdir(projectOutputDir)
    const mdFiles = files.filter((f) => f.endsWith(".md") && f !== "summary.md")

    let summary = `# 代码分析报告汇总\n\n`
    summary += `生成时间：${new Date().toLocaleString("zh-CN")}\n\n`
    summary += `## 报告列表\n\n`

    for (const file of mdFiles.sort()) {
      const stepName = file.replace(/\.md$/, "")
      summary += `- ${stepName}: \`${file}\`\n`
    }

    summary += `\n## 各步骤详细分析\n\n`

    // 读取每个报告的前 500 字符作为摘要
    for (const file of mdFiles.sort()) {
      const filePath = path.join(projectOutputDir, file)
      const stepName = file.replace(/\.md$/, "")
      try {
        const content = await fs.readFile(filePath, "utf-8")
        const preview = content.substring(0, 500).replace(/\n+/g, " ")
        summary += `### ${stepName}\n\n${preview}...\n\n`
      } catch {
        summary += `### ${file}\n\n[读取失败]\n\n`
      }
    }

    return summary
  }

  /**
   * 过滤 Claude CLI 调试日志
   */
  private filterClaudeLogs(content: string): string {
    const lines = content.split('\n')
    const filteredLines = lines.filter((line) => {
      // 过滤掉已知的调试日志格式
      if (/\[log_[a-zA-Z0-9]+\]/.test(line)) return false
      if (/response start|response parsed/.test(line)) return false
      if (/AsyncGeneratorFunction/.test(line)) return false
      if (/AbortController|ReadableStream|locked: false/.test(line)) return false
      if (/^Headers \{/.test(line)) return false
      if (/durationMs:/.test(line)) return false
      if (/sZ \{/.test(line)) return false
      if (/^  [a-zA-Z]+:/.test(line) && line.includes('http')) return false // HTTP 相关的缩进日志
      return true
    })
    return filteredLines.join('\n')
  }

  /**
   * 执行单个分析任务
   * @param taskId 任务 ID
   * @param projectPath 项目路径
   * @param selectedStepKeys 选择的步骤 key 列表
   */
  async execute(
    taskId: string,
    projectPath: string,
    selectedStepKeys?: string[]
  ): Promise<void> {
    try {
      // 触发 task_start hook
      await this.triggerHook({ type: "task_start", taskId })

      // 检查 Claude CLI 可用性
      if (!ClaudeCode.isAvailable()) {
        throw new Error(
          "Claude CLI 未安装或未配置，请先安装：npm install -g @anthropic-ai/claude-code"
        )
      }

      // 注册 skills
      await this.registerSkills(projectPath)
      await this.triggerHook({ type: "skill_registered", taskId })

      // 初始化输出目录
      const projectOutputDir = path.join(
        this.outputDir,
        path.basename(projectPath)
      )
      await fs.mkdir(projectOutputDir, { recursive: true })

      // 根据选择的步骤执行分析
      const stepsToExecute = selectedStepKeys
        ? ANALYSIS_STEPS.filter((step) => selectedStepKeys.includes(step.key))
        : ANALYSIS_STEPS

      if (stepsToExecute.length === 0) {
        throw new Error("未选择任何分析步骤")
      }

      // 检查是否有依赖步骤（第 7 步需要前面的步骤结果）
      const hasRefactorStep = stepsToExecute.some(
        (s) => s.key === "refactor_suggestions"
      )
      const hasPreviousSteps = stepsToExecute.some(
        (s) => s.id >= 1 && s.id <= 6
      )

      if (hasRefactorStep && !hasPreviousSteps) {
        throw new Error("重构与改进建议需要至少一个分析步骤的结果")
      }

      // 分离并行步骤和顺序步骤
      const parallelSteps = stepsToExecute.filter((s) => s.id >= 1 && s.id <= 6)
      const sequentialSteps = stepsToExecute.filter((s) => s.id === 7)

      const totalSteps = stepsToExecute.length
      let completedSteps = 0

      if (parallelSteps.length > 0) {
        // 触发 batch_start hook
        await this.triggerHook({
          type: "batch_start",
          taskId,
          data: {
            batchName: "分析步骤",
            steps: parallelSteps.map((s) => s.name),
          },
        })

        // 并行执行步骤
        const parallelPromises = parallelSteps.map(async (step) => {
          // 触发 step_start hook
          await this.triggerHook({
            type: "step_start",
            taskId,
            stepId: step.id,
            stepKey: step.key,
            stepName: step.name,
          })

          try {
            const fullPrompt = `${step.prompt}。请将分析报告以 Markdown 格式输出。`
            const stepOutputPath = path.join(
              projectOutputDir,
              `${step.name}.md`
            )

            console.log(
              `[CodeAnalysisExecutor] 执行步骤 ${step.id}: ${step.name}`
            )

            const claude = new ClaudeCode()
            await claude.run(projectPath, fullPrompt, {
              timeout: this.stepTimeout,
              outputFile: stepOutputPath,
            })

            console.log(
              `[CodeAnalysisExecutor] 步骤 ${step.id} 完成，报告已保存：${stepOutputPath}`
            )

            // 读取生成的文档内容
            let content = ""
            try {
              const rawContent = await fs.readFile(stepOutputPath, "utf-8")
              content = this.filterClaudeLogs(rawContent)
            } catch (readError) {
              console.error(
                `Failed to read step output: ${stepOutputPath}`,
                readError
              )
            }

            completedSteps++

            // 触发 step_complete hook
            await this.triggerHook({
              type: "step_complete",
              taskId,
              stepId: step.id,
              stepKey: step.key,
              stepName: step.name,
              data: { outputPath: stepOutputPath, content },
            })

            return { success: true, step }
          } catch (stepError: any) {
            console.error(`Step ${step.name} failed:`, stepError.message)

            // 触发 step_error hook
            await this.triggerHook({
              type: "step_error",
              taskId,
              stepId: step.id,
              stepKey: step.key,
              stepName: step.name,
              data: { error: stepError.message },
            })

            return { success: false, step, error: stepError.message }
          }
        })

        // 等待所有并行步骤完成
        const parallelResults = await Promise.all(parallelPromises)
        const successCount = parallelResults.filter((r) => r.success).length
        console.log(
          `[CodeAnalysisExecutor] 并行步骤完成：${successCount}/${parallelSteps.length} 成功`
        )

        // 触发 batch_complete hook
        await this.triggerHook({
          type: "batch_complete",
          taskId,
          data: { successCount, total: parallelSteps.length },
        })
      }

      // 执行顺序步骤（第 7 步：重构与改进建议）
      for (const step of sequentialSteps) {
        // 触发 step_start hook
        await this.triggerHook({
          type: "step_start",
          taskId,
          stepId: step.id,
          stepKey: step.key,
          stepName: step.name,
        })

        try {
          const fullPrompt = `${step.prompt}。请将分析报告以 Markdown 格式输出。`
          const stepOutputPath = path.join(projectOutputDir, `${step.name}.md`)

          console.log(
            `[CodeAnalysisExecutor] 执行步骤 ${step.id}: ${step.name}`
          )

          const claude = new ClaudeCode()
          await claude.run(projectPath, fullPrompt, {
            timeout: this.stepTimeout,
            outputFile: stepOutputPath,
          })

          console.log(
            `[CodeAnalysisExecutor] 步骤 ${step.id} 完成，报告已保存：${stepOutputPath}`
          )

          // 读取生成的文档内容
          let content = ""
          try {
            content = await fs.readFile(stepOutputPath, "utf-8")
          } catch (readError) {
            console.error(
              `Failed to read step output: ${stepOutputPath}`,
              readError
            )
          }

          completedSteps++

          // 触发 step_complete hook
          await this.triggerHook({
            type: "step_complete",
            taskId,
            stepId: step.id,
            stepKey: step.key,
            stepName: step.name,
            data: { outputPath: stepOutputPath, content },
          })
        } catch (stepError: any) {
          console.error(`Step ${step.name} failed:`, stepError.message)

          // 触发 step_error hook
          await this.triggerHook({
            type: "step_error",
            taskId,
            stepId: step.id,
            stepKey: step.key,
            stepName: step.name,
            data: { error: stepError.message },
          })
        }
      }

      // 生成汇总报告
      await this.triggerHook({ type: "generating_summary", taskId })

      const summaryReport = await this.generateSummaryReport(projectOutputDir)
      const summaryPath = path.join(projectOutputDir, "summary.md")
      await fs.writeFile(summaryPath, summaryReport)

      // 触发 summary_complete hook
      await this.triggerHook({ type: "summary_complete", taskId })

      // 触发 task_complete hook
      await this.triggerHook({
        type: "task_complete",
        taskId,
        data: { reportDir: projectOutputDir },
      })
    } catch (error: any) {
      console.error("[CodeAnalysisExecutor] Analysis error:", error)

      // 触发 task_error hook
      await this.triggerHook({
        type: "task_error",
        taskId,
        data: { error: error.message },
      })

      throw error
    }
  }
}
