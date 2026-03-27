/**
 * 运行方式：ts-node .\chat.ts
 *
 * 命令行 RAG 问答系统
 */

import { RagAgentService } from "../src/rag/RagAgentService"

// ==================== 命令行交互 ====================

;(() => {
  const ragAgentService = new RagAgentService()

  ragAgentService.startChatCli()
})()
