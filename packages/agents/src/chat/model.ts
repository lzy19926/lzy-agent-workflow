/**
 * Chat 模型配置
 *
 * 使用通义千问 qwen-plus 模型
 */
// 加载 .env 文件中的环境变量
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";

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
});