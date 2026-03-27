/**
 *
 *┌────────────────────┬──────────────┬───────────────────────────┐
  │       工具名        │    数据表     │           用途             │
  ├────────────────────┼──────────────┼───────────────────────────┤
  │ search_crawlee_doc │ crawlee_docs │ 检索 Crawlee 爬虫框架文档    │
  ├────────────────────┼──────────────┼───────────────────────────┤
  │ search_react_doc   │ react_docs   │ 检索 React 库文档           │
  ├────────────────────┼──────────────┼───────────────────────────┤
  │ search_tldraw_doc  │ tldraw_docs  │ 检索 tldraw 绘图库文档    │
  └────────────────────┴──────────────┴───────────────────────────┘
 *
 * **/
import * as z from "zod"
import { tool, type DynamicTool } from "@langchain/core/tools"
import type { VectorStore } from "../memory/VectorStore"

// ==================== Schema 定义 ====================

const retrieveSchema = z.object({ query: z.string() })

// ==================== 工具定义 ====================
export const initTools = (
  VectorStore: VectorStore
): DynamicTool<unknown, unknown>[] => {
  if (!VectorStore.isInitialized) {
    VectorStore.init()

    throw new Error("VectorStore 未初始化，请先调用 VectorStore.init()")
  }

  // 从 VectorStore 获取向量存储实例
  const textVectorStore_crawlee = VectorStore.textVectorStore_crawlee!
  const textVectorStore_react = VectorStore.textVectorStore_react!
  const textVectorStore_tldraw = VectorStore.textVectorStore_tldraw!

  /**
   * 从 Crawlee 文档中检索信息
   */
  const search_crawlee_doc = tool<any>(
    async ({ query }: any) => {
      const retrievedDocs = await textVectorStore_crawlee.similaritySearch(
        query,
        2
      )
      const serialized = retrievedDocs
        .map((doc) => `来源：${doc.metadata.source}\n内容：${doc.pageContent}`)
        .join("\n")
      return [serialized, retrievedDocs]
    },
    {
      name: "search_crawlee_doc",
      description: "从 Crawlee 文档中检索与查询相关的信息。",
      schema: retrieveSchema,
      responseFormat: "content_and_artifact",
    }
  )

  /**
   * 从 React 文档中检索信息
   */
  const search_react_doc = tool<any>(
    async ({ query }: any) => {
      const retrievedDocs = await textVectorStore_react.similaritySearch(
        query,
        2
      )
      const serialized = retrievedDocs
        .map((doc) => `来源：${doc.metadata.source}\n内容：${doc.pageContent}`)
        .join("\n")
      return [serialized, retrievedDocs]
    },
    {
      name: "search_react_doc",
      description: "从 React 文档中检索与查询相关的信息。",
      schema: retrieveSchema,
      responseFormat: "content_and_artifact",
    }
  )

  /**
   * 从 tldraw 文档中检索信息
   */
  const search_tldraw_doc = tool<any>(
    async ({ query }: any) => {
      const retrievedDocs = await textVectorStore_tldraw.similaritySearch(
        query,
        2
      )
      const serialized = retrievedDocs
        .map((doc) => `来源：${doc.metadata.source}\n内容：${doc.pageContent}`)
        .join("\n")
      return [serialized, retrievedDocs]
    },
    {
      name: "search_tldraw_doc",
      description: "从 tldraw 文档中检索与查询相关的信息。",
      schema: retrieveSchema,
      responseFormat: "content_and_artifact",
    }
  )

  return [search_crawlee_doc, search_react_doc, search_tldraw_doc]
}
