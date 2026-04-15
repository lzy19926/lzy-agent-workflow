/**
 ChatAgent 评估套件, 原理: 单条对话调用轨迹和预期轨迹做代码相似度对比
 */

import { ChatAgent } from "../src/chatAgent/ChatAgent"
import { createTrajectoryMatchEvaluator } from "agentevals"
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages"
// ==================== 命令行交互 ====================
;(async () => {

  const chatAgent = new ChatAgent()
  const agent = await chatAgent.getAgent()

  //
  const evaluator = createTrajectoryMatchEvaluator({
    trajectoryMatchMode: "unordered",
  })

  async function testMultipleToolsAnyOrder() {
    // 单次invoke拿到messages轨迹列表,展现了单次对话的完整调用轨迹
    const result = await agent.invoke(
      {
        messages: [new HumanMessage("你好,我的名字是什么?")],
      },
      {
        configurable: { thread_id: "1" },
      }
    )
    // 定义参考轨迹
    const referenceTrajectory = [
      new HumanMessage("你好,我的名字是什么?"),
      new AIMessage({
        content: "",
        tool_calls: [{ id: "call_1", name: "get_user_name", args: {} }],
      }),
      new ToolMessage({
        content: "阳玖",
        tool_call_id: "call_1",
      }),
      new AIMessage({
        content: "",
        tool_calls: [{ id: "call_1", name: "get_user_name", args: {} }],
      }),
      new ToolMessage({
        content: "阳玖",
        tool_call_id: "call_1",
      }),
      new AIMessage({
        content: `Returning structured response: {"shot_response":"阳玖"}`,
      }),
    ]
    // 使用evaluator判断轨迹是否相似
    const evalResult = await evaluator({
      outputs: result.messages,
      referenceOutputs: referenceTrajectory,
    })

    console.log(evalResult)
  }

  testMultipleToolsAnyOrder()
})()
