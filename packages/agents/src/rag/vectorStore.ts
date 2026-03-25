/**
 * 向量存储器模块
 * 提供文本和多模态向量存储功能
 */

import { loadEnv } from "./env.ts"
import { OpenAIEmbeddings } from "@langchain/openai"
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector"
import { pool } from "./postregSQL.ts"
import cliProgress from "cli-progress"

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
 * 用于存储crawlee文档相关的文本向量数据
 */
export const textVectorStore_crawlee = await PGVectorStore.initialize(
  textEmbeddings,
  {
    pool,
    tableName: "crawlee_docs",
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
  }
)

/**
 * 文本向量存储器 - PostgreSQL 向量存储
 * 用于存储 React 文档相关的文本向量数据
 */
export const textVectorStore_react = await PGVectorStore.initialize(
  textEmbeddings,
  {
    pool,
    tableName: "react_docs",
    columns: {
      idColumnName: "id",
      vectorColumnName: "vector",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
    dimensions: 1024,
  }
)

/**
 * 文本向量存储器 - PostgreSQL 向量存储
 * 用于存储 tldraw 文档相关的文本向量数据
 */
export const textVectorStore_tldraw = await PGVectorStore.initialize(
  textEmbeddings,
  {
    pool,
    tableName: "tldraw_docs",
    columns: {
      idColumnName: "id",
      vectorColumnName: "vector",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
    dimensions: 1024,
  }
)

// ==================== 检索和存储方法 ====================

/**
 * 相似度去重配置
 */
interface DedupConfig {
  /** 相似度阈值 (0-1)，超过此值的文档视为重复，默认 0.9 */
  similarityThreshold?: number
  /** 是否启用去重，默认 true */
  enabled?: boolean
}

/**
 * 检查文档是否已存在（基于向量相似度）
 * @param doc - 要检查的文档
 * @param threshold - 相似度阈值
 * @returns 如果存在相似文档返回 true
 */
async function isDuplicate(
  doc: any,
  store: PGVectorStore,
  threshold: number = 0.9
): Promise<boolean> {
  const results = await store.similaritySearchWithScore(doc.pageContent, 1)

  if (results.length === 0) {
    return false
  }

  const [_, score] = results[0]
  // score 是距离，越小越相似，转换为相似度
  const similarity = 1 - score

  return similarity >= threshold
}

/**
 * 将文档存储到向量库中（支持相似度去重）
 * @param docs - 要存储的文档数组
 * @param config - 去重配置
 */
export async function storePageData(
  docs: any[],
  store: PGVectorStore,
  config: DedupConfig = { similarityThreshold: 0.9, enabled: true }
) {
  if (!config.enabled) {
    await store.addDocuments(docs)
    console.log(`💾 Stored ${docs.length} documents to vector store.`)
    return
  }

  const docsToStore: any[] = []
  const duplicates: any[] = []

  // 初始化进度条
  const progressBar = new cliProgress.SingleBar(
    {
      format: "💾 Storing [{bar}] {percentage}% | {value}/{total} docs | {status}",
      clearOnComplete: false,
    },
    cliProgress.Presets.shades_classic
  )
  progressBar.start(docs.length, 0, { status: "Checking duplicates..." })

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i]
    const duplicate = await isDuplicate(doc, store, config.similarityThreshold)

    if (duplicate) {
      duplicates.push(doc)
    } else {
      docsToStore.push(doc)
    }

    progressBar.update(i + 1, { status: `Processed ${doc.metadata.source.slice(0, 30)}...` })
  }

  progressBar.stop()
  console.log(`✅ Stored ${docsToStore.length} new documents, skipped ${duplicates.length} duplicates.`)
}
