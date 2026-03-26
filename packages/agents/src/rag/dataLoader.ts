/**
 * 数据加载器模块
 * 提供多种数据源的加载和存储功能
 */

import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import type { Document } from "@langchain/core/documents"
import fs from "fs"

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv"
import { JSONLoader } from "@langchain/classic/document_loaders/fs/json"
import { JSONLinesLoader } from "@langchain/classic/document_loaders/fs/json";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text"
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { EPubLoader } from "@langchain/community/document_loaders/fs/epub";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import { SRTLoader } from "@langchain/community/document_loaders/fs/srt";
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
 * 根据文件格式加载文件数据
 * @param filePath - 文件路径
 * @returns 加载并拆分后的文档数组
 */
export async function loadFileData(filePath: string): Promise<Document[]> {
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在：${filePath}`)
  }

  // 获取文件扩展名
  const ext = filePath.toLowerCase().split(".").pop()

  let loader: any

  // 根据扩展名选择对应的 loader
  switch (ext) {
    case "pdf":
      loader = new PDFLoader(filePath)
      break
    case "csv":
      loader = new CSVLoader(filePath)
      break
    case "json":
      loader = new JSONLoader(filePath)
      break
    case "jsonl":
    case "jsonlines":
      loader = new JSONLinesLoader(filePath, "/")
      break
    case "txt":
    case "text":
    case "md":
    case "markdown":
      loader = new TextLoader(filePath)
      break
    case "docx":
      loader = new DocxLoader(filePath)
      break
    case "epub":
      loader = new EPubLoader(filePath)
      break
    case "pptx":
      loader = new PPTXLoader(filePath)
      break
    case "srt":
      loader = new SRTLoader(filePath)
      break
    default:
      throw new Error(`不支持的文件格式：${ext}`)
  }

  const docs = await loader.load()
  console.log(`Loaded ${docs.length} documents from .${ext} file.`)

  return docs
}
