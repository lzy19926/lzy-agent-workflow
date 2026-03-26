/**
 * 语音识别分段结果
 */
export interface ASRSegment {
  /**
   * 开始时间（秒）
   */
  beginTime: number
  /**
   * 结束时间（秒）
   */
  endTime: number
  /**
   * 文本内容
   */
  text: string
  /**
   * 置信度
   */
  confidence?: number
}

/**
 * 语音识别任务
 */
export interface ASRTask {
  id: string
  status: "pending" | "running" | "completed" | "failed"
  progress: number
  fileUrl: string
  fileName?: string
  currentStep?: string
  error?: string
  createdAt: string
  completedAt?: string
}

/**
 * 语音识别结果
 */
export interface ASRResult {
  /**
   * 任务 ID
   */
  taskId: string
  /**
   * 任务状态
   */
  status: string
  /**
   * 识别结果文本
   */
  text?: string
  /**
   * 分段结果
   */
  segments?: ASRSegment[]
}

/**
 * 验证结果
 */
export interface ValidateResult {
  valid: boolean
  error?: string
}

/**
 * Hook 事件类型
 */
export type HookEventType =
  | "task_start"
  | "task_complete"
  | "task_error"
  | "step_start"
  | "step_complete"
  | "step_error"
  | "submitting"
  | "submitted"
  | "polling"
  | "completed"
  | "fetching_result"

/**
 * Hook 事件数据
 */
export interface HookEvent {
  type: HookEventType
  taskId: string
  stepKey?: string
  stepName?: string
  data?: any
}

/**
 * Hook 函数类型
 */
export type ASRHook = (event: HookEvent) => Promise<void> | void

/**
 * Hook 配置
 */
export interface HookConfig {
  onTaskStart?: ASRHook
  onTaskComplete?: ASRHook
  onTaskError?: ASRHook
  onStepStart?: ASRHook
  onStepComplete?: ASRHook
  onStepError?: ASRHook
  onSubmitting?: ASRHook
  onSubmitted?: ASRHook
  onPolling?: ASRHook
  onCompleted?: ASRHook
  onFetchingResult?: ASRHook
}

/**
 * ASR 配置
 */
export interface ASRConfig {
  /**
   * API Key
   */
  apiKey: string
  /**
   * 模型名称，默认 qwen3-asr-flash-filetrans
   */
  model?: string
  /**
   * 提交任务 API 端点，默认北京地域
   */
  submitUrl?: string
  /**
   * 查询任务 API 基础 URL，默认北京地域
   */
  queryUrl?: string
  /**
   * 是否开启逆文本正则化
   */
  enableItn?: boolean
  /**
   * 是否开启词级时间戳
   */
  enableWords?: boolean
  /**
   * 语言代码
   */
  language?: string
  /**
   * 轮询间隔（毫秒），默认 2000ms
   */
  pollInterval?: number
  /**
   * 超时时间（毫秒），默认 300000ms
   */
  timeout?: number
}

// ==================== 内部接口 ====================
// 以下接口仅供 ASRService 内部使用

/**
 * 提交任务响应
 */
export interface SubmitResponse {
  output: {
    task_id: string
  }
  request_id: string
}

/**
 * 查询任务响应
 */
export interface QueryResponse {
  output: {
    task_status: string
    results?: {
      url?: string
    }
    task_metrics?: {
      TOTAL: number
      SUCCEEDED: number
      FAILED: number
    }
  }
  request_id: string
}

/**
 * 识别结果文件内容
 */
export interface AsrResultFile {
  file_url?: string
  audio_info?: {
    format?: string
    sample_rate?: number
  }
  transcripts?: Array<{
    channel_id: number
    text: string
  }>
  sentences?: Array<{
    begin_time: number
    end_time: number
    text: string
    confidence?: number
  }>
}
