/**
 * Chat Agent 工具模块 - 提供智能体可调用的工具
 *
 * @module chat/chatAgentTools
 */

import { tool, ToolMessage, type ToolRuntime } from "langchain"
import { Command } from "@langchain/langgraph"
import * as z from "zod"


// ==================== 工具定义 ====================

/**
 * 初始化 Chat Agent 的工具列表
 */
export const initTools = (): any[] => {
  return []
}
