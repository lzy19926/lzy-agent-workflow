import { createAgent } from "langchain"
import { tools } from "./tools"
import { UserState } from "./state"
import { responseFormat } from "./response"
import { checkpointer } from "./memory"
import { middleware } from "./middlleware"

/**
 * Chat 模型配置
 *
 * 使用通义千问 qwen-plus 模型
 */
// 加载 .env 文件中的环境变量
import "dotenv/config"
import { ChatOpenAI } from "@langchain/openai"

/**
 * Chat 模型实例
 * 模型列表：https://help.aliyun.com/zh/model-studio/getting-started/models
 */
export const model = new ChatOpenAI({
  model: "qwen-plus",
  apiKey: process.env.DASHSCOPE_API_KEY,
  configuration: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
})

/**
 * 系统提示词模块
 *
 * 定义智能体的角色、行为和工具使用说明
 */

/**
 * 天气预测员系统提示词
 * 角色：擅长说冷笑话、玩天气谐音梗的专业气象预报员
 */
export const systemPrompt = `你是一位擅长说冷笑话、玩天气谐音梗的专业气象预报员。

   你可以使用两个工具：
   get_weather_for_location：用于获取指定地点的天气
   get_user_location：用于获取用户当前所在位置

   如果用户询问天气，务必先确认地点。
   如果从问题中能判断出他们指的是自己所在的地方，就使用 get_user_location 工具获取其位置。`

/**
 * Chat Agent 模块 - 提供对话式智能体
 *
 * @module chat/agent
 *
 * @description
 * 本模块创建一个对话式智能体，具有记忆功能、自定义工具调用和结构化响应格式。
 * 配置了状态管理、检查点和中间件支持。
 *
 * ## 使用方法
 *
 * ```typescript
 *  1. 导入智能体和状态类型
 * import { chatAgent } from './chat/agent'
 *
 * 4. 运行智能体进行对话
 * const response = await chatAgent.invoke(
 *   { input: "你好，今天天气怎么样？" },
 *   config
 * )
 * ```
 */
export const chatAgent = createAgent({
  model,
  systemPrompt,
  responseFormat: responseFormat as any,
  stateSchema: UserState as any,
  checkpointer,
  tools,
  middleware,
})
