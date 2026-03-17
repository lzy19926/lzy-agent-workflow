/**
 * 智能体模块
 *
 * 配置和创建 LangChain 智能体
 */
import { createAgent } from "langchain";
import { systemPrompt } from "./prompt";
import { tools } from "./tools";
import { UserState } from "./state";
import { responseFormat } from "./response";
import { checkpointer } from "./memory";
import { middleware } from "./middlleware";
import { model } from "./model";


/**
 * 创建智能体实例
 * 配置所有必要的组件：模型、提示词、工具、记忆、响应格式等
 */
export const agent = createAgent({
    model,
    systemPrompt,
    responseFormat: responseFormat as any,
    stateSchema: UserState as any,
    checkpointer,
    tools,
    middleware,
});