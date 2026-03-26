import https from "https"
import {
  type QwenChatConfig,
  type QwenResponse,
  type ChatMessage,
  type QwenApiResponse,
  type QwenChatHookConfig,
  type QwenChatHookEvent,
  type ValidateResult,
} from "./types"

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Required<QwenChatConfig> = {
  apiKey: "",
  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  model: "qwen3-max",
}

/**
 * QwenChat 服务
 *
 * 负责执行 Qwen 聊天请求，通过 Hook 机制传递执行状态
 * 支持普通对话和结构化输出（JSON 格式）
 *
 * 使用示例：
 * ```typescript
 * const service = new QwenChatService(
 *   { apiKey: "sk-xxx" },
 *   { onChatComplete: (event) => console.log("对话完成", event.response) }
 * );
 *
 * // 普通对话
 * const result1 = await service.chat("req-1", [{ role: "user", content: "你好" }]);
 *
 * // 结构化输出
 * const result2 = await service.chatWithJson(
 *   "req-2",
 *   [{ role: "user", content: "我叫张三，今年 25 岁" }],
 *   "请抽取用户的姓名与年龄信息，以 JSON 格式返回"
 * );
 * ```
 */
export class QwenChatService {
  private config: Required<QwenChatConfig>
  private hooks: QwenChatHookConfig

  constructor(config?: Partial<QwenChatConfig>, hooks?: QwenChatHookConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    }
    this.hooks = hooks || {}
  }

  /**
   * 触发 Hook
   */
  private async triggerHook(event: QwenChatHookEvent): Promise<void> {
    const hookMap: Record<
      QwenChatHookEvent["type"],
      keyof QwenChatHookConfig | undefined
    > = {
      chat_start: "onChatStart",
      chat_complete: "onChatComplete",
      chat_error: "onChatError",
      json_chat_start: "onJsonChatStart",
      json_chat_complete: "onJsonChatComplete",
      json_parse_error: "onJsonParseError",
      request_start: "onRequestStart",
      request_complete: "onRequestComplete",
      request_error: "onRequestError",
    }

    const hookKey = hookMap[event.type]
    if (hookKey) {
      const hook = this.hooks[hookKey]
      if (hook) {
        try {
          await hook(event)
        } catch (error) {
          console.error(`[QwenChatService] Hook ${event.type} error:`, error)
        }
      }
    }
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `qwen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 验证配置
   */
  async validateConfig(): Promise<ValidateResult> {
    if (!this.config.apiKey) {
      return {
        valid: false,
        error: "API Key 不能为空",
      }
    }

    if (!this.config.baseUrl.startsWith("http")) {
      return {
        valid: false,
        error: "Base URL 必须是有效的 HTTP/HTTPS 地址",
      }
    }

    return {
      valid: true,
    }
  }

  /**
   * 普通对话
   * @param requestId 请求 ID
   * @param messages 消息列表
   * @param systemPrompt 系统提示词（可选）
   */
  async chat(
    requestId: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<QwenResponse> {
    const allMessages: ChatMessage[] = []

    if (systemPrompt) {
      allMessages.push({ role: "system", content: systemPrompt })
    }
    allMessages.push(...messages)

    try {
      // 触发 chat_start hook
      await this.triggerHook({
        type: "chat_start",
        requestId,
        messages: allMessages,
      })

      const response = await this.request(requestId, {
        messages: allMessages,
      })

      const result: QwenResponse = {
        content: response.choices[0]?.message?.content || "",
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      }

      // 触发 chat_complete hook
      await this.triggerHook({
        type: "chat_complete",
        requestId,
        response: result,
      })

      return result
    } catch (error: any) {
      console.error("[QwenChatService] Chat error:", error)

      // 触发 chat_error hook
      await this.triggerHook({
        type: "chat_error",
        requestId,
        data: { error: error.message },
      })

      throw error
    }
  }

  /**
   * 结构化输出对话（JSON 格式）
   * @param requestId 请求 ID
   * @param messages 消息列表
   * @param systemPrompt 系统提示词，描述需要抽取的 JSON 结构
   * @param responseFormat 响应格式配置
   */
  async chatWithJson(
    requestId: string,
    messages: ChatMessage[],
    systemPrompt: string
  ): Promise<QwenResponse> {
    const allMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ]

    try {
      // 触发 json_chat_start hook
      await this.triggerHook({
        type: "json_chat_start",
        requestId,
        messages: allMessages,
      })

      const response = await this.request(requestId, {
        messages: allMessages,
      })

      const content = response.choices[0]?.message?.content || ""
      let data: unknown

      try {
        data = JSON.parse(content)
      } catch (parseError) {
        console.warn("JSON 解析失败:", content)

        // 触发 json_parse_error hook
        await this.triggerHook({
          type: "json_parse_error",
          requestId,
          data: { content, error: parseError },
        })
      }

      const result: QwenResponse = {
        content,
        data,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      }

      // 触发 json_chat_complete hook
      await this.triggerHook({
        type: "json_chat_complete",
        requestId,
        response: result,
      })

      return result
    } catch (error: any) {
      console.error("[QwenChatService] JSON chat error:", error)

      // 触发 chat_error hook
      await this.triggerHook({
        type: "chat_error",
        requestId,
        data: { error: error.message },
      })

      throw error
    }
  }

  /**
   * 发送 API 请求
   */
  private async request(
    requestId: string,
    body: {
      messages: ChatMessage[]
      response_format?: { type: "json_object" }
    }
  ): Promise<QwenApiResponse> {
    try {
      // 触发 request_start hook
      await this.triggerHook({
        type: "request_start",
        requestId,
        messages: body.messages,
      })

      const result = await this.httpPost<QwenApiResponse>(
        `${this.config.baseUrl}/chat/completions`,
        {
          model: this.config.model,
          messages: body.messages,
          response_format: body.response_format,
        }
      )

      // 触发 request_complete hook
      await this.triggerHook({
        type: "request_complete",
        requestId,
        data: { response: result },
      })

      return result
    } catch (error: any) {
      console.error("[QwenChatService] Request error:", error)

      // 触发 request_error hook
      await this.triggerHook({
        type: "request_error",
        requestId,
        data: { error: error.message },
      })

      throw error
    }
  }

  /**
   * HTTP POST 请求
   */
  private httpPost<T>(url: string, body: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url)
      const bodyStr = JSON.stringify(body)

      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
        },
      }

      const req = https.request(options, (res) => {
        let data = ""

        res.on("data", (chunk) => {
          data += chunk
        })

        res.on("end", () => {
          try {
            const response = JSON.parse(data) as T

            if (res.statusCode && res.statusCode >= 400) {
              const errorResponse = response as any
              reject(
                new Error(
                  `API 请求失败：${
                    errorResponse.error?.message || res.statusCode
                  }`
                )
              )
            } else {
              resolve(response)
            }
          } catch (parseError) {
            reject(new Error(`响应解析失败：${data}`))
          }
        })
      })

      req.on("error", (e) => {
        reject(new Error(`请求错误：${e.message}`))
      })

      req.write(bodyStr)
      req.end()
    })
  }
}
