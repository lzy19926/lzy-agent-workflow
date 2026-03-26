/**
 * 运行方式：ts-node .\chat.ts
 *
 * 命令行 RAG 问答系统
 */

import readline from "readline"
import { ragAgent } from "../rag/agent.ts"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ==================== 命令行交互 ====================

/**
 * 创建 readline 接口
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

/**
 * 流式输出代理响应
 */
async function streamAgentResponse(message: string) {
  const agentInputs = { messages: [{ role: "user", content: message }] }

  const stream = await ragAgent.stream(agentInputs, { streamMode: "values" })

  process.stdout.write("\n[Agent]: ")
  for await (const step of stream) {
    const lastMessage = step.messages[step.messages.length - 1]

    // 只输出 assistant 的回复
    if (lastMessage.name === "model") {
      process.stdout.write(lastMessage.content)
    }
  }
  console.log("\n")
}

/**
 * 主函数 - 命令行交互
 */
async function main() {
  console.log("=".repeat(50))
  console.log("欢迎使用 RAG 问答系统!")
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

    await streamAgentResponse(question)
    rl.question("请输入您的问题：", ask)
  })
}

main()
