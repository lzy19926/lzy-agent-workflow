/**
 * 聊天消息
 */
export interface ChatMessage {
  /**
   * 角色：system, user, assistant
   */
  role: "system" | "user" | "assistant"
  /**
   * 消息内容
   */
  content: string
}

/**
 * Qwen 响应结果
 */
export interface QwenResponse<T = unknown> {
  /**
   * 模型输出的内容
   */
  content: string
  /**
   * 解析后的结构化数据（如果设置了 JSON 格式）
   */
  data?: T
  /**
   * 使用情况
   */
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Qwen API 响应结构
 */
export interface QwenApiResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  error?: {
    message: string
    type: string
    code: string
  }
}

/**
 * Qwen 客户端配置
 */
export interface QwenChatConfig {
  /**
   * API Key
   */
  apiKey: string
  /**
   * 基础 URL，默认为阿里云北京地域
   */
  baseUrl?: string
  /**
   * 默认模型，默认为 qwen3-max
   */
  model?: string
}

/**
 * Hook 事件类型
 */
export type QwenChatHookEventType =
  | "chat_start"
  | "chat_complete"
  | "chat_error"
  | "json_chat_start"
  | "json_chat_complete"
  | "json_parse_error"
  | "request_start"
  | "request_complete"
  | "request_error"

/**
 * Hook 事件数据
 */
export interface QwenChatHookEvent {
  type: QwenChatHookEventType
  requestId: string
  messages?: ChatMessage[]
  response?: QwenResponse
  data?: any
}

/**
 * Hook 函数类型
 */
export type QwenChatHook = (event: QwenChatHookEvent) => Promise<void> | void

/**
 * Hook 配置
 */
export interface QwenChatHookConfig {
  onChatStart?: QwenChatHook
  onChatComplete?: QwenChatHook
  onChatError?: QwenChatHook
  onJsonChatStart?: QwenChatHook
  onJsonChatComplete?: QwenChatHook
  onJsonParseError?: QwenChatHook
  onRequestStart?: QwenChatHook
  onRequestComplete?: QwenChatHook
  onRequestError?: QwenChatHook
}

/**
 * 验证结果
 */
export interface ValidateResult {
  valid: boolean
  error?: string
}
