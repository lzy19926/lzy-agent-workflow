/**
 * 状态模块
 *
 * 定义智能体的状态结构和类型
 */

import { StateSchema } from "@langchain/langgraph";
import * as z from "zod";

/**
 * 用户状态 Schema
 * 用于定义智能体可以访问和修改的状态字段
 */
export const UserState = new StateSchema({
  user_id: z.string(),
});
