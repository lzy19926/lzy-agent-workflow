/**
 * 运行方式：ts-node .\chat.ts
 *
 * 命令行 RAG 问答系统
 */

import { RagAgent } from "../src/ragAgent/RagAgent"
import { ChatAgent } from "../src/chatAgent/ChatAgent"
// ==================== 命令行交互 ====================
;(() => {
  // const ragAgent = new RagAgent()
  // ragAgent.startChatCli()

  const chatAgent = new ChatAgent()
  chatAgent.startChatCli()
})()
