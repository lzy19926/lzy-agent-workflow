/**
 * VectorStoreService - 向量存储服务
 * 提供文本和多模态向量存储功能
 */

import { loadEnv } from "../tools/env"
import { OpenAIEmbeddings } from "@langchain/openai"
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector"
//@ts-ignore
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store"
import { Pool } from "pg"
import cliProgress from "cli-progress"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { OllamaEmbeddings } from "@langchain/ollama"
loadEnv()

// ==================== 类型定义 ====================

/**
 * 支持的向量存储表名
 */
export type VectorStoreTable = "crawlee_docs" | "react_docs" | "tldraw_docs"

/**
 * 向量存储配置
 */
export interface VectorStoreConfig {
  tableName: VectorStoreTable
  dimensions?: number
}

/**
 * 相似度去重配置
 */
export interface DedupConfig {
  /** 相似度阈值 (0-1)，超过此值的文档视为重复，默认 0.9 */
  similarityThreshold?: number
  /** 是否启用去重，默认 true */
  enabled?: boolean
}

/**
 * Embeddings 模型配置
 */
export interface EmbeddingsConfig {
  model?: string
  apiKey?: string
  baseURL?: string
  batchSize?: number
  stripNewLines?: boolean
}

// ==================== VectorStore ====================

export class VectorStore {
  // PostgreSQL 实例
  private pool: Pool | null = null
  public postgresStore: PostgresStore | null = null
  // Embeddings 模型实例
  private textEmbeddings: OpenAIEmbeddings | OllamaEmbeddings | null = null
  private multimodalEmbeddings: OpenAIEmbeddings | null = null
  // 文本分割器实例
  private textSplitter: RecursiveCharacterTextSplitter | null = null
  // 向量存储实例
  public textVectorStore_crawlee: PGVectorStore | null = null
  public textVectorStore_react: PGVectorStore | null = null
  public textVectorStore_tldraw: PGVectorStore | null = null

  // 是否已初始化标志
  public isInitialized: boolean = false

  constructor() {
    this.init()
  }

  /**
   * 初始化服务，创建数据库连接池，初始化 Embeddings 模型和向量存储
   */
  async init() {
    if (this.isInitialized) {
      console.warn("VectorStoreService 已经初始化，重复调用 init() 将被忽略。")
      return
    }

    this.initPostgresStore()
    this.initEmbeddings()
    this.initTextSplitter()
    await this.initVectorStore()

    this.isInitialized = true
  }

  /** * 初始化文本分割器
   * @returns 初始化后的 RecursiveCharacterTextSplitter 实例
   */
  private initTextSplitter(): RecursiveCharacterTextSplitter {
    if (!this.textSplitter) {
      this.textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      })
    }
    return this.textSplitter
  }

  /**
   * 初始化 PostgreSQL 存储
   * @returns 初始化后的 PostgresStore 实例
   */
  private initPostgresStore(): PostgresStore {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      user: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "",
      database: process.env.POSTGRES_DB || "RAG",
    })

    const DB_URI = process.env.POSTGRES_URI || ""

    this.postgresStore = PostgresStore.fromConnString(DB_URI)

    return this.postgresStore
  }

  /**
   * 初始化 Embeddings 模型
   * @returns 初始化后的 Embeddings 实例
   */
  private initEmbeddings(): {
    textEmbeddings: OpenAIEmbeddings | OllamaEmbeddings
    multimodalEmbeddings: OpenAIEmbeddings | OllamaEmbeddings
  } {
    /**
     * 文本 Embeddings 模型配置
     */
    // this.textEmbeddings = new OpenAIEmbeddings({
    //   model: "text-embedding-v4",
    //   apiKey: process.env.DASHSCOPE_API_KEY,
    //   configuration: {
    //     baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    //   },
    //   batchSize: 10,
    //   stripNewLines: true,
    //   dimensions: 1024,
    // })

    this.textEmbeddings = new OllamaEmbeddings({
      model: "qwen3-embedding:4b",
      dimensions: 1024,
    })

    /**
     * 多模态 Embeddings 模型配置
     */
    this.multimodalEmbeddings = new OpenAIEmbeddings({
      model: "tongyi-embedding-vision-flash",
      apiKey: process.env.DASHSCOPE_API_KEY,
    })

    return {
      textEmbeddings: this.textEmbeddings,
      multimodalEmbeddings: this.multimodalEmbeddings,
    }
  }

  /**
   * 初始化向量存储
   * @param tables - 要初始化的表名数组，默认为所有表
   * @returns 包含所有初始化的向量存储实例的对象
   */
  private async initVectorStore(): Promise<
    Record<VectorStoreTable, PGVectorStore>
  > {
    if (!this.textEmbeddings) {
      this.initEmbeddings()
    }
    // ==================== 向量存储器 ====================
    /**
     * 文本向量存储器 - PostgreSQL 向量存储
     * 用于存储crawlee文档相关的文本向量数据
     */
    this.textVectorStore_crawlee = await PGVectorStore.initialize(
      this.textEmbeddings!,
      {
        pool: this.pool!,
        tableName: "crawlee_docs",
        columns: {
          idColumnName: "id",
          vectorColumnName: "vector",
          contentColumnName: "content",
          metadataColumnName: "metadata",
        },
        // 向量维度：必须和你的 Embedding 模型匹配
        dimensions: 1024,
      }
    )

    /**
     * 文本向量存储器 - PostgreSQL 向量存储
     * 用于存储 React 文档相关的文本向量数据
     */
    this.textVectorStore_react = await PGVectorStore.initialize(
      this.textEmbeddings!,
      {
        pool: this.pool!,
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
    this.textVectorStore_tldraw = await PGVectorStore.initialize(
      this.textEmbeddings!,
      {
        pool: this.pool!,
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

    return {
      crawlee_docs: this.textVectorStore_crawlee,
      react_docs: this.textVectorStore_react,
      tldraw_docs: this.textVectorStore_tldraw,
    }
  }

  /**
   * 检查文档是否已存在（基于向量相似度）
   * @param doc - 要检查的文档
   * @param store - 向量存储实例
   * @param threshold - 相似度阈值
   * @returns 如果存在相似文档返回 true
   */
  private async isDuplicate(
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
   * @param store - 向量存储实例
   * @param config - 去重配置
   */
  async storeDocData(
    completeDocs: any[],
    store: PGVectorStore,
    config: DedupConfig = { similarityThreshold: 0.9, enabled: true }
  ): Promise<void> {
    // 文本分割
    const docs = await this.textSplitter!.splitDocuments(completeDocs)
    console.log(
      `Split ${completeDocs.length} documents into ${docs.length} chunks.`
    )

    // 如果未启用去重，直接存储所有文档
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
        format:
          "💾 Storing [{bar}] {percentage}% | {value}/{total} docs | {status}",
        clearOnComplete: false,
      },
      cliProgress.Presets.shades_classic
    )
    progressBar.start(docs.length, 0, { status: "Checking duplicates..." })

    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]
      const duplicate = await this.isDuplicate(
        doc,
        store,
        config.similarityThreshold
      )

      if (duplicate) {
        duplicates.push(doc)
      } else {
        docsToStore.push(doc)
      }

      progressBar.update(i + 1, {
        status: `Processed ${doc.metadata.source.slice(0, 30)}...`,
      })
    }

    progressBar.stop()
    console.log(
      `✅ Stored ${docsToStore.length} new documents, skipped ${duplicates.length} duplicates.`
    )
  }

  /**
   * 关闭数据库连接池
   */
  async destroyPool(): Promise<void> {
    await this.pool?.end()
    this.textEmbeddings = null
    this.multimodalEmbeddings = null
  }
}

// ==================== 默认导出 ====================
export const vectorStore = new VectorStore()
