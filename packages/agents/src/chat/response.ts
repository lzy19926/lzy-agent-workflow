/**
 * 响应格式模块
 *
 * 定义智能体结构化输出的 Zod schema
 */

import * as z from "zod";

/**
 * 天气预测员响应格式
 * 包含谐音梗回答和天气状况
 */
export const responseFormat = z.object({
  punny_response: z.string().describe("包含谐音梗或冷笑话的回答"),
  weather_conditions: z.string().optional().describe("天气状况信息，如果 applicable"),
});
