// ============ 7. 运行智能体 ============
import { agent } from "./agent"

// `thread_id` 是对话的唯一标识符
const config = {
    configurable: { thread_id: "1" },
    state: { user_id: "1" },
};

async function run() {
    console.log("=== 第一次询问天气 ===");
    const response = await agent.invoke(
        { messages: [{ role: "user", content: "外面的天气如何？" }] },
        config
    );
    console.log("结构化响应:", response.structuredResponse);

    console.log("\n=== 第二次感谢 ===");
    const thankYouResponse = await agent.invoke(
        { messages: [{ role: "user", content: "谢谢！" }] },
        config
    );
    console.log("结构化响应:", thankYouResponse.structuredResponse);
}

run()