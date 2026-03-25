/**
 * 数据加载器模块
 * 提供多种数据源的加载和存储功能
 */

import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio"
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import type { Document } from "@langchain/core/documents"
import fs from "fs"

// ==================== 文本分割器 ====================

/**
 * 全局单例的文本分割器
 * chunkSize: 1000, chunkOverlap: 200
 */
export const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
})

// ==================== 加载函数 ====================

/**
 * 加载网页数据
 * @param url - 要加载的页面 URL
 * @param selector - CSS 选择器，用于筛选要抓取的元素
 * @returns 加载并拆分后的文档数组
 */
export async function loadPageData(
  url: string,
  selector: any = "span"
): Promise<Document[]> {
  const loader = new CheerioWebBaseLoader(url, { selector })
  const docs = await loader.load()
  console.log(`Total characters: ${docs[0].pageContent.length}`)

  const allSplits = await textSplitter.splitDocuments(docs)
  console.log(`Split blog post into ${allSplits.length} sub-documents.`)

  return allSplits
}

/**
 * 加载 PDF 文件
 * @param filePath - PDF 文件路径
 * @returns 加载并拆分后的文档数组
 */
export async function loadPdfData(filePath: string): Promise<Document[]> {
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在：${filePath}`)
  }

  const loader = new PDFLoader(filePath)
  const docs = await loader.load()
  console.log(`Loaded ${docs.length} pages from PDF.`)

  const allSplits = await textSplitter.splitDocuments(docs)
  console.log(`Split PDF into ${allSplits.length} sub-documents.`)

  return allSplits
}

/**
 * 加载 JSON 文件
 * @param filePath - JSON 文件路径
 * @returns 加载并拆分后的文档数组
 */
export async function loadJsonData(filePath: string): Promise<Document[]> {
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在：${filePath}`)
  }

  // 检查文件扩展名
  if (!filePath.endsWith(".json")) {
    throw new Error(`文件扩展名不是 .json: ${filePath}`)
  }

  // 读取并解析 JSON
  let jsonData
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8")
    jsonData = JSON.parse(fileContent)
  } catch (error) {
    throw new Error(`JSON 解析失败：${filePath}, ${(error as Error).message}`)
  }

  // 将 JSON 转为文档对象
  const docs = Array.isArray(jsonData)
    ? jsonData.map((item) => ({
        pageContent: JSON.stringify(item),
        metadata: { source: filePath },
      }))
    : [
        {
          pageContent: JSON.stringify(jsonData),
          metadata: { source: filePath },
        },
      ]

  console.log(`Loaded ${docs.length} documents from JSON.`)

  const splits = await textSplitter.splitDocuments(docs)
  console.log(`Split JSON into ${splits.length} chunks.`)

  return splits
}