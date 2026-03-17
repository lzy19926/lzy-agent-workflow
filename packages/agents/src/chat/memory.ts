/**
 * 记忆模块
 *
 * 定义智能体的记忆/检查点机制
 */

import { MemorySaver } from "@langchain/langgraph";

/**
 * 内存检查点
 * 临时记忆，服务重启后记忆会丢失
 * 适用于测试和不需持久化的场景
 */
export const checkpointer = new MemorySaver();

/**
 * PostgreSQL 持久化记忆（示例代码，需要时启用）
 *
 * 使用方法：
 * 1. 安装依赖：pnpm add @langchain/langgraph-checkpoint-postgres
 * 2. 取消下面代码的注释
 * 3. 配置 DB_URI 环境变量
 *
 * ```ts
 * import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
 *
 * const DB_URI = "postgresql://postgres:postgres@localhost:5442/postgres?sslmode=disable";
 * export const checkpointer = PostgresSaver.fromConnString(DB_URI);
 * ```
 */
