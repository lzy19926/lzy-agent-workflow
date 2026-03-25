/**
 * 向量存储器模块
 * 提供文本和多模态向量存储功能
 */

import { loadEnv } from "./tools.ts"
import { OpenAIEmbeddings } from "@langchain/openai"
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory"
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector"
import { pool } from "./postregSQL.ts"

loadEnv()
// ==================== 模型配置 ====================

/**
 * 文本 Embeddings 模型配置
 */
export const textEmbeddings = new OpenAIEmbeddings({
  model: "text-embedding-v4",
  apiKey: process.env.DASHSCOPE_API_KEY,
  configuration: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  batchSize: 10,
  stripNewLines: true,
})

/**
 * 多模态 Embeddings 模型配置
 */
export const multimodalEmbeddings = new OpenAIEmbeddings({
  model: "tongyi-embedding-vision-flash",
  apiKey: process.env.DASHSCOPE_API_KEY,
})

// ==================== 向量存储器 ====================

/**
 * 文本向量存储器 - PostgreSQL 向量存储
 */
export const textVectorStore = await PGVectorStore.initialize(textEmbeddings, {
  pool,
  tableName: "test_table",
  columns: {
    idColumnName: "id",
    vectorColumnName: "vector",
    contentColumnName: "content",
    metadataColumnName: "metadata",
  },
  // 向量维度：必须和你的 Embedding 模型匹配
  // text-embedding-v4 = 1024
  // text-embedding-3-small = 1536
  // text-embedding-3-large = 3072
  dimensions: 1024,
})

/**
 * 多模态向量存储器 - 内存向量存储
 */
export const multimodalVectorStore = new MemoryVectorStore(multimodalEmbeddings)

// ==================== 检索和存储方法 ====================
export const testRetriever = textVectorStore.asRetriever({
  searchType: "mmr",
  searchKwargs: {
    fetchK: 1,
    lambda: 0.9,
  },
})

/**
 * 将文档存储到向量库中
 * @param docs - 要存储的文档数组
 */
export async function storePageData(docs: any[]) {
  await textVectorStore.addDocuments(docs)
  console.log(`Stored ${docs.length} documents to vector store.`)
}
