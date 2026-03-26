/**
 * 分析任务状态
 */
export interface AnalysisTask {
  id: string
  status: "pending" | "running" | "completed" | "failed"
  progress: number
  projectPath: string
  projectName?: string
  currentStep?: string
  error?: string
  createdAt: string
  completedAt?: string
}

/**
 * 项目信息
 */
export interface ProjectInfo {
  name: string
  path: string
  language: string
  framework?: string
  fileCount: number
  techStack: string[]
}

/**
 * 验证结果
 */
export interface ValidateResult {
  valid: boolean
  info?: ProjectInfo
  error?: string
}

/**
 * 分析步骤配置（用于前端展示）
 */
export interface AnalysisStepConfig {
  id: number
  name: string
  key: string
  description: string
  skill?: string
}

/**
 * 分析步骤定义（内部使用）
 */
export interface AnalysisStep extends AnalysisStepConfig {
  prompt: string
  outputPrefix: string
}

/**
 * Hook 事件类型
 */
export type HookEventType =
  | "task_start"
  | "task_complete"
  | "task_error"
  | "skill_registered"
  | "step_start"
  | "step_complete"
  | "step_error"
  | "batch_start"
  | "batch_complete"
  | "generating_summary"
  | "summary_complete"

/**
 * Hook 事件数据
 */
export interface HookEvent {
  type: HookEventType
  taskId: string
  stepId?: number
  stepKey?: string
  stepName?: string
  data?: any
}

/**
 * Hook 函数类型
 */
export type AnalysisHook = (event: HookEvent) => Promise<void> | void

/**
 * Hook 配置
 */
export interface HookConfig {
  onTaskStart?: AnalysisHook
  onTaskComplete?: AnalysisHook
  onTaskError?: AnalysisHook
  onSkillRegistered?: AnalysisHook
  onStepStart?: AnalysisHook
  onStepComplete?: AnalysisHook
  onStepError?: AnalysisHook
  onBatchStart?: AnalysisHook
  onBatchComplete?: AnalysisHook
  onGeneratingSummary?: AnalysisHook
  onSummaryComplete?: AnalysisHook
}

// 分析步骤定义
export const ANALYSIS_STEPS: AnalysisStep[] = [
  {
    id: 1,
    name: "架构分析",
    key: "architecture_analysis",
    description: "项目整体架构分析",
    skill: "architecture-analysis",
    prompt: "使用 skill: architecture-analysis 对该项目进行整体架构分析",
    outputPrefix: "01-architecture-analysis",
  },
  {
    id: 2,
    name: "功能分析",
    key: "feature_analysis",
    description: "主要功能点代码实现分析",
    skill: "architecture-analysis",
    prompt:
      "使用 skill: architecture-analysis 对项目进行功能分析，说明各主要功能点的代码实现",
    outputPrefix: "02-feature-analysis",
  },
  {
    id: 3,
    name: "前端安全性分析",
    key: "security_analysis",
    description: "前端安全性检查",
    skill: "frontend-mobile-security-xss-scan",
    prompt:
      "使用 skill: frontend-mobile-security-xss-scan 检查项目 src 下的文件，分析前端安全性",
    outputPrefix: "03-security-analysis",
  },
  {
    id: 4,
    name: "代码质量分析",
    key: "code_quality",
    description: "代码质量与编码规范检查",
    skill: "coding-standards",
    prompt:
      "使用 skill: coding-standards 检查项目的代码质量与编码规范，包含 TypeScript 类型体系质量",
    outputPrefix: "04-code-quality",
  },
  {
    id: 5,
    name: "性能分析",
    key: "performance_analysis",
    description: "项目性能分析",
    skill: undefined,
    prompt: "对项目的性能进行分析，总结问题、优缺点、技术思路",
    outputPrefix: "05-performance-analysis",
  },
  {
    id: 6,
    name: "代码逐行审查",
    key: "code_review",
    description: "代码逐行审查，整理优缺点",
    skill: "audit-context-building",
    prompt:
      "使用 skill: audit-context-building 对项目代码做逐行审查，将优点和缺点整理成两个独立的章节",
    outputPrefix: "06-code-review",
  },
  {
    id: 7,
    name: "重构与改进建议",
    key: "refactor_suggestions",
    description: "生成问题、风险点、改进建议报告",
    skill: undefined,
    prompt:
      "基于先前步骤生成的项目文档，生成一份当前项目问题、风险点、改进建议的报告",
    outputPrefix: "07-refactor-suggestions",
  },
]
