import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store"
import { Pool } from "pg"
import { loadEnv, __dirname, __filename } from "./tools.ts"

loadEnv()

// 1. 初始化 PostgreSQL 连接池
export const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "lzy19926",
  database: "RAG",
})

// 2. 初始化 PostgreSQL 存储（LangGraph Checkpoint）
const DB_URI = process.env.POSTGRES_URI || ""

const store = PostgresStore.fromConnString(DB_URI)

await store.setup()

export { store }
