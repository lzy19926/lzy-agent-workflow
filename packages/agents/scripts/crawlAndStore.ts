/**
 * 网站爬取并存储到向量数据库
 *
 * 功能:
 * 1. 使用 Crawlee 爬取网站
 * 2. 读取爬取生成的 JSON 文件
 * 3. 将数据存储到 PostgreSQL 向量数据库
 *
 * 使用示例:
 * - 方式 1: 直接运行此脚本爬取并存储
 *   npm run tsx src/scripts/crawlAndStore.ts [url] [maxPages]
 *
 * - 方式 2: 先爬取，再手动调用存储函数
 */

import { crawlWebsite } from "../src/tools/crawlWebsite"
import { textSplitter, loadFileData } from "../src/rag/dataLoader"
import { storePageData, textVectorStore_crawlee } from "../src/rag/vectorStore"
import type { PGVectorStore } from "@langchain/community/vectorstores/pgvector"

/**
 * 爬取网站并将数据存储到向量数据库
 * @param url - 要爬取的网站 URL
 * @param maxPages - 最大爬取页面数，默认 50
 * @param vectorStoreTable - 向量存储表名，默认 'crawlee_docs'
 */
export async function crawlAndStore(
  url: string,
  store: PGVectorStore,
  maxPages: number = 50
) {
  console.log(`\n🚀 开始爬取并存储：${url}`)
  console.log(`   最大页面数：${maxPages}`)
  console.log(`   目标向量表：${store.tableName}\n`)

  // 步骤 1: 爬取网站
  const { exportPath, itemCount } = await crawlWebsite(url, maxPages)
  console.log(`\n✅ 爬取完成，保存到：${exportPath}`)

  // 步骤 2: 读取爬取的文件
  console.log(`\n📖 读取爬取数据...`)
  const docs = await loadFileData(exportPath)
  console.log(`   加载了 ${docs.length} 个文档`)

  // 步骤 3: 拆分文档
  const splits = await textSplitter.splitDocuments(docs)
  console.log(`拆分文档为 ${splits.length} 片段.`)

  // 步骤 4: 存储到向量数据库
  console.log(`\n💾 存储到向量数据库...`)
  await storePageData(docs, store, {
    similarityThreshold: 0.9,
    enabled: true,
  })

  console.log(`\n✨ 全部完成！`)
  console.log(`   爬取页面：${itemCount}`)
  console.log(`   向量文档：${docs.length}`)

  return { exportPath, itemCount, docCount: docs.length }
}

crawlAndStore("https://crawlee.dev", textVectorStore_crawlee, 5).catch(
  (err) => {
    console.error("❌ 爬取和存储过程中发生错误：", err)
  }
)
