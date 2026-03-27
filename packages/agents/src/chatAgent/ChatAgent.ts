/**
 * Chat Agent 模块 - 提供对话式智能体
 *
 * @module chat/ChatAgent
 *
 * @description
 * 本模块创建一个对话式智能体，具有记忆管理、工具调用和结构化响应能力。
 * 支持多轮对话、状态管理和中间件处理。
 *
 * ## 使用方法
 *
 * ```typescript
 * // 1. 导入智能体
 * import { ChatAgent } from './chat/ChatAgent'
 *
 * // 2. 创建智能体实例
 * const chatAgent = new ChatAgent()
 *
 * // 3. 运行智能体进行对话
 * const response = await chatAgent.invoke({
 *   input: "你好，今天天气怎么样？"
 * })
 *
 * // 4. 获取回答
 * console.log(response.output)
 * ```
 *
 * ## 运行示例
 * ```bash
 * ts-node ./src/chat/ChatAgent.ts
 * ```
 */

// ==================== 导入模块 ====================

// LangChain 核心模块
import { createAgent } from "langchain"
import { ChatOpenAI } from "@langchain/openai"
import { loadEnv } from "../tools/env"
import readline from "readline"

// 状态、工具、记忆、响应格式
import { initTools } from "./chatAgentTools"
import { MemorySaver } from "@langchain/langgraph"

// 中间件
import { summarizationMiddleware as _summarizationMiddleware } from "langchain"

// 状态 Schema 定义
import { StateSchema } from "@langchain/langgraph"
import * as z from "zod"

// 加载环境变量
loadEnv()

// ==================== 类型定义 ====================

/**
 * Chat Agent 配置接口
 */
interface ChatAgentConfig {
  agentName: string
  modelName: string
  apiKey: string | undefined
  baseURL: string
}

// ==================== 常量定义 ====================
const DEFAULT_CONFIG: ChatAgentConfig = {
  agentName: "lzy-chat-agent",
  modelName: "qwen-plus",
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
}

/**
 * 问答系统提示词
 * 角色：极简精准问答工具
 */
const systemPrompt = `
你是一个**极简精准问答工具**，仅负责直接、准确、简洁地回答用户问题。
  规则：
  1. 只回答问题本身，不添加任何多余解释、铺垫、客套话。
  2. 答案精准无误，不猜测、不脑补、不扩展无关内容。
  3. 语言极度精简，能用短句不用长句，能用关键词不用段落。
  4. 不主动提问，不反问，不建议，不引导，不闲聊。
  5. 若问题无法回答，仅回复：无法回答。
`

// ==================== ChatAgent 类 ====================
export class ChatAgent {
  public chatAgent: any = null
  private model: ChatOpenAI | null = null
  private config: ChatAgentConfig = DEFAULT_CONFIG

  constructor() {
    this.init()
  }

  /** 初始化智能体 */
  async init() {
    // ==================== 模型配置 ====================
    this.model = new ChatOpenAI({
      model: this.config.modelName,
      apiKey: this.config.apiKey,
      configuration: {
        baseURL: this.config.baseURL,
      },
    })

    // ==================== 工具准备 ====================
    const tools = initTools()

    // ==================== 状态 Schema 定义 ====================
    const ChatAgentState = new StateSchema({
      user_id: z.string(),
      userName: z.string().optional(),
    })

    // ==================== 响应格式定义 ====================
    const responseFormat = z.object({
      shot_response: z.string().describe("精简的回答"),
    })

    // =================== 内存检查点 临时记忆 =================
    const checkpointer = new MemorySaver()

    // ==================== 智能体创建 ====================
    this.chatAgent = createAgent({
      name: this.config.agentName,
      model: this.model,
      systemPrompt,
      tools,
      responseFormat: responseFormat as any,
      stateSchema: ChatAgentState as any,
      checkpointer,
    })
  }

  /** 获取智能体实例 */
  async getAgent() {
    if (!this.chatAgent) {
      await this.init()
    }

    return this.chatAgent as any
  }

  // 进行单条对话
  async chat(message: string) {
    const config = {
      configurable: { thread_id: "1" },
      state: { user_id: "1" },
    }

    const agentInputs = {
      messages: [{ role: "user", content: message }],
    }

    const chatAgent = await this.getAgent()

    const response = await chatAgent.stream(agentInputs, config)

    return response
  }

  /**
   * 流式输出代理响应
   * @param message - 用户消息
   */
  async streamAgentResponse(message: string) {
    const stream = await this.chat(message)

    process.stdout.write("\n[Agent]: ")
    for await (const step of stream) {
      const message = step.model_request?.structuredResponse?.shot_response
      process.stdout.write(message)
    }
    console.log("\n")
  }

  /** 启动命令行聊天 */
  async startChatCli() {
    const that = this
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    console.log("=".repeat(50))
    console.log("欢迎使用 Chat 对话系统!")
    console.log("输入 'quit' 或 'exit' 退出")
    console.log("输入 'clear' 清空对话历史")
    console.log("=".repeat(50))
    console.log()

    rl.question("请输入您的问题：", async function ask(question) {
      const input = question.trim().toLowerCase()

      if (input === "quit" || input === "exit") {
        console.log("再见!")
        rl.close()
        return
      }

      if (input === "clear") {
        console.log("对话历史已清空\n")
        rl.question("请输入您的问题：", ask)
        return
      }

      if (!question.trim()) {
        rl.question("请输入您的问题：", ask)
        return
      }

      await that.streamAgentResponse(question)
      rl.question("请输入您的问题：", ask)
    })
  }
}
