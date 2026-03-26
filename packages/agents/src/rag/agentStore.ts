import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store"
import { Pool } from "pg"
import { loadEnv } from "./env"

loadEnv()

// 1. 初始化 PostgreSQL 连接池 - 所有配置从环境变量获取
export const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "",
  database: process.env.POSTGRES_DB || "RAG",
})

// 2. 初始化 PostgreSQL 存储（LangGraph Checkpoint）
const DB_URI = process.env.POSTGRES_URI || ""

const store = PostgresStore.fromConnString(DB_URI)

await store.setup()

export { store }
