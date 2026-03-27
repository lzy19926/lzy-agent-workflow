import { RagAgentService } from "@videomemo/agents"
import { Response } from "express"

/**
 * 对话响应
 */
export interface ChatResponse {
  answer: string
  conversationId?: string
  timestamp: string
}

/**
 * 健康状态
 */
export interface ChatHealth {
  status: "ok" | "error"
  service: string
  timestamp: string
  message?: string
}

/**
 * RAG Chat 服务
 *
 * 负责处理 RAG Agent 对话请求，支持普通对话和 SSE 流式对话
 *
 * 使用示例：
 * ```typescript
 * const service = new RAGChatService();
 *
 * // 普通对话
 * const result = await service.chat('你好');
 *
 * // 流式对话 (在路由中)
 * router.get('/stream', async (req, res) => {
 *   res.setHeader('Content-Type', 'text/event-stream');
 *   await service.streamChat('你好', res);
 *   res.end();
 * });
 * ```
 */
export class RAGChatService {
  private ragAgentService: RagAgentService

  constructor() {
    this.ragAgentService = new RagAgentService()
  }

  /**
   * 生成消息 ID
   */
  private generateMessageId(): string {
    return `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 普通对话
   * @param message 用户消息
   * @param conversationId 对话 ID（可选）
   * @returns 对话响应
   */
  async chat(message: string, conversationId?: string): Promise<ChatResponse> {
    const messageId = this.generateMessageId()

    try {
      const agentInputs = {
        messages: [{ role: "user" as const, content: message }],
      }
      const ragAgent = await this.ragAgentService.getAgent()
      const response = await ragAgent.invoke(agentInputs)

      // 提取最后一个 model 消息作为回答
      const lastMessage = response.messages[response.messages.length - 1]
      const answer = lastMessage?.content || "抱歉，未能生成回答。"

      const result: ChatResponse = {
        answer,
        conversationId,
        timestamp: new Date().toISOString(),
      }

      return result
    } catch (error: any) {
      console.error("[RAGChatService] Chat error:", error)
      throw error
    }
  }

  /**
   * 流式对话 - SSE 方式写入响应
   * @param message 用户消息
   * @param res Express Response 对象
   */
  async streamChat(message: string, res: Response): Promise<void> {
    const messageId = this.generateMessageId()
    let previousContent = ""

    try {
      const agentInputs = {
        messages: [{ role: "user" as const, content: message }],
      }
      const ragAgent = await this.ragAgentService.getAgent()
      const stream = await ragAgent.stream(agentInputs, {
        streamMode: "values",
      })

      // 流式读取并写入响应
      for await (const step of stream) {
        const lastMessage = step.messages[step.messages.length - 1]

        // 只处理 model 的回复
        if (lastMessage?.name === "model") {
          const currentContent = lastMessage.content || ""
          const newContent = currentContent.slice(previousContent.length)
          if (newContent) {
            res.write(
              `data: ${JSON.stringify({ content: currentContent })}\n\n`
            )
            previousContent = currentContent
          }
        }
      }

      // 发送结束标记
      res.write("data: [DONE]\n\n")
    } catch (error: any) {
      console.error("[RAGChatService] Stream to response error:", error)
      throw error
    }
  }

  /**
   * 获取健康状态
   */
  getHealth(): ChatHealth {
    return {
      status: "ok",
      service: "rag-chat",
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * 默认实例
 */
export const defaultChatService = new RAGChatService()
