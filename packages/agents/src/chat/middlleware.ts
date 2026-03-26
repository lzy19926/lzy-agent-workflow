/**
 * 中间件模块
 *
 * 配置智能体的中间件链
 */

import { RemoveMessage } from "@langchain/core/messages";
import { createMiddleware, summarizationMiddleware as _summarizationMiddleware } from "langchain";
import { REMOVE_ALL_MESSAGES } from "@langchain/langgraph";
import { model } from "./agent";

/**
 * 消息历史修剪中间件
 *
 * 用于控制对话上下文的长度，防止 token 超出限制。
 * 策略：保留第一条消息（通常是系统提示或初始上下文）和最近的几条消息，
 * 删除中间的旧消息，从而保持对话的连贯性同时减少 token 消耗。
 *
 * 触发时机：在模型调用之前 (beforeModel) 执行
 *
 * 修剪逻辑：
 * - 如果消息总数 <= 3 条：不进行修剪
 * - 如果消息总数为偶数：保留第 1 条 + 最近 3 条
 * - 如果消息总数为奇数：保留第 1 条 + 最近 4 条
 *
 * 使用场景：
 * - 长对话场景中避免上下文过长
 * - 节省 token 成本
 * - 保持对话核心上下文（开头 + 最近内容）
 */
export const trimMessages = createMiddleware({
    name: "TrimMessages",

    /**
     * 在模型调用前处理消息
     * @param state - 当前状态，包含 messages 数组
     * @returns 更新后的状态或 undefined（不修改）
     */
    beforeModel: (state) => {
        const messages = state.messages;

        // 如果消息数量较少，不需要修剪
        if (messages.length <= 3) {
            return;
        }

        const firstMsg = messages[0];
        const recentMessages =
            messages.length % 2 === 0 ? messages.slice(-3) : messages.slice(-4);
        const newMessages = [firstMsg, ...recentMessages];

        return {
            messages: [
                new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
                ...newMessages,
            ],
        };
    },
});

/**
 * 删除旧消息中间件
 *
 * 用于逐步删除对话历史中最早的消息，控制上下文长度。
 * 与 trimMessages 不同，此中间件采用渐进式删除策略，
 * 每次只删除最早的两条消息，而不是一次性修剪大量消息。
 *
 * 触发时机：在模型调用之后 (afterModel) 执行
 *
 * 删除逻辑：
 * - 如果消息总数 > 2 条：删除最早的两条消息
 * - 如果消息总数 <= 2 条：不进行删除
 *
 * 使用场景：
 * - 需要更精细地控制消息删除节奏
 * - 希望在每次对话后逐步清理历史
 * - 与 trimMessages 配合使用，实现多层次的消息管理
 */
export const deleteOldMessages = createMiddleware({
    name: "DeleteOldMessages",

    afterModel: (state) => {
        const messages = state.messages;

        // 如果消息数量超过 2 条，删除最早的两条
        if (messages.length > 2) {
            return {
                messages: messages
                    .slice(0, 2)
                    .map((m) => new RemoveMessage({ id: m.id! })),
            };
        }
        return;
    },
});

/**
 * 对话历史总结中间件
 * 自动对超长对话进行总结压缩，保留上下文并控制 token 数量
 */
export const summarizationMiddleware = _summarizationMiddleware({
    model,
    trigger: { tokens: 4000 },
    keep: { messages: 20 },
});

/**
 * 中间件数组
 * 按顺序执行，可根据需要添加或移除中间件
 * 当前启用的中间件：
 * - summarizationMiddleware: 自动总结长对话
 */
export const middleware = [
    summarizationMiddleware,
    // trimMessages,        // 按需启用
    // deleteOldMessages,   // 按需启用
];
