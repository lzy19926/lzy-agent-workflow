/**
 * 工具模块
 *
 * 定义智能体可调用的所有工具
 */

import { tool, ToolMessage, type ToolRuntime } from "langchain";
import { Command } from "@langchain/langgraph";
import * as z from "zod";
import { UserState } from "./state";

/**
 * 天气查询工具
 * 返回指定城市的天气信息
 */
export const getWeather = tool(
  ({ city }) => {
    return `It's always sunny in ${city}!`;
  },
  {
    name: "get_weather_for_location",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string().describe("The city to get the weather for"),
    }),
  }
);

/**
 * 获取用户位置工具
 * 根据 user_id 返回用户所在位置
 */
export const getUserLocation = tool(
  (_, config: ToolRuntime<typeof UserState.State>) => {
    const { user_id } = config.state
    return user_id === "1" ? "上海" : "成都";
  },
  {
    name: "get_user_location",
    description: "Retrieve user information based on user ID",
    schema: z.object({}),
  }
);

/**
 * 获取用户信息工具
 * 根据 user_id 返回用户姓名
 */
export const getUserInfo = tool(
  async (_, config: ToolRuntime<typeof UserState.State>) => {
    const user_id = config.state.user_id;
    return user_id === "user_123" ? "John Doe" : "Unknown User";
  },
  {
    name: "get_user_info",
    description: "Get user info",
    schema: z.object({}),
  }
);

/**
 * 更新用户信息工具
 * 使用 Command 更新用户状态和消息历史
 */
export const updateUserInfo = tool(
  async (_, config: ToolRuntime<typeof UserState.State>) => {
    const user_id = config.state.user_id;
    const name = user_id === "user_123" ? "John Smith" : "Unknown user";
    return new Command({
      update: {
        userName: name,
        messages: [
          new ToolMessage({
            content: "Successfully looked up user information",
            tool_call_id: config.toolCall?.id ?? "",
          }),
        ],
      },
    });
  },
  {
    name: "update_user_info",
    description: "Look up and update user info.",
    schema: z.object({}),
  }
);

// 导出所有工具数组
export const tools = [getWeather];