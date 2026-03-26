//@ts-nocheck

/**
 * 网站内容爬取脚本
 *
 * 功能:
 * - 爬取网站的文字内容
 * - 自动提取页面标题和正文
 * - 支持多级页面爬取
 * - 数据保存到本地存储
 *
 * 使用方法:
 *   import { crawlWebsite } from "./webCrawler.js"
 *   await crawlWebsite("https://example.com", 100)
 *
 * 或直接运行:
 *   node webCrawler.js [起始 URL] [最大页面数]
 */

import { CheerioCrawler, Dataset, Configuration } from "crawlee"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"
import { config } from "dotenv"

/**
 * 加载环境变量
 * 从项目根目录下的 .env 文件加载环境变量到 process.env 中
 *  设置 Crawlee 存储目录为 agents/crawlerStorage
 */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// 设置 Crawlee 存储目录为 agents/crawlerStorage
process.env.CRAWLEE_STORAGE_DIR = path.resolve(__dirname, "../../crawlee_storage")

/**
 * 清理 HTML 内容，提取纯文本
 * @param {CheerioAPI} $ - Cheerio 对象
 * @returns {string} 清理后的文本内容
 */
function extractTextContent($) {
  // 移除不需要的元素
  $(
    "script, style, nav, footer, header, aside, .ads, .advertisement, .cookie-notice, iframe, noscript"
  ).remove()

  // 尝试获取主要内容区域
  let mainContent = $(
    "main, article, .content, .post-content, .article-content"
  ).first()

  // 如果没有找到主要内容区域，使用 body
  if (mainContent.length === 0) {
    mainContent = $("body")
  }

  // 提取文本并清理
  const text = mainContent
    .text()
    .replace(/\s+/g, " ") // 合并多个空白字符
    .replace(/[\r\n]+/g, "\n") // 规范化换行符
    .trim()

  return text
}

/**
 * 获取页面的元数据
 * @param {CheerioAPI} $ - Cheerio 对象
 * @param {string} url - 当前 URL
 * @returns {Object} 元数据对象
 */
function extractMetadata($, url) {
  const title = $("title").text().trim()
  const description = $('meta[name="description"]').attr("content") || ""
  const keywords = $('meta[name="keywords"]').attr("content") || ""
  const author = $('meta[name="author"]').attr("content") || ""
  const ogImage = $('meta[property="og:image"]').attr("content") || ""

  return {
    title,
    description,
    keywords,
    author,
    ogImage,
    url,
  }
}

/**
 * 爬取网站并保存数据到指定目录
 * @param {string} url - 要爬取的网站 URL
 * @param {number} maxPages - 最大爬取页面数，默认 50
 * @param {string} outputDir - 输出目录，默认 ../../crawlee_storage
 * @returns {Promise<{exportPath: string, itemCount: number}>} 导出路径和页面数量
 */
export async function crawlWebsite(
  url,
  maxPages = 50,
  outputDir = path.resolve(__dirname, "../../crawlee_storage")
) {
  // 根据 URL 生成文件夹名称
  const urlObj = new URL(url)
  const folderName = urlObj.hostname.replace(/\./g, "_")
  const saveDir = path.resolve(outputDir, folderName)

  // 创建保存目录
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true })
  }

  console.log(`
🕷️  网站爬取脚本
================
起始 URL: ${url}
最大页面数：${maxPages}
输出目录：${saveDir}
`)

  // 配置 Crawlee 使用自定义存储目录
  const config = new Configuration({
    storageClientOptions: {
      localDataDirectory: saveDir,
    },
    purgeOnStart: false, // 保留已有数据，支持增量爬取
  })

  // 创建爬虫配置
  const crawler = new CheerioCrawler(
    {
      // 请求处理器
      async requestHandler({ request, $, enqueueLinks, log }) {
        const url = request.loadedUrl

        // 提取元数据
        const metadata = extractMetadata($, url)

        // 提取正文内容
        const content = extractTextContent($)

        // 记录爬取进度
        log.info(`Crawling: ${metadata.title} (${url})`)
        log.info(`Content length: ${content.length} characters`)

        // 保存数据
        await Dataset.pushData({
          ...metadata,
          content,
          crawledAt: new Date().toISOString(),
        })

        // 提取并添加新链接到队列
        await enqueueLinks({
          // 只爬取同一域名的链接
          strategy: "same-hostname",
          // 排除的 URL 模式
          exclude: [
            // 排除登录、注册、退出等页面
            /.*\/login.*/i,
            /.*\/signup.*/i,
            /.*\/logout.*/i,
            // 排除包含查询参数的 URL (避免无限爬取)
            /\?.*=/i,
            // 排除文件下载链接
            /.*\.(pdf|jpg|jpeg|png|gif|svg|zip|rar|exe|dmg)$/i,
          ],
        })
      },

      // 错误处理
      async failedRequestHandler({ request, log }, error) {
        log.error(`Request ${request.url} failed: ${error.message}`)
      },

      // 爬取限制
      maxRequestsPerCrawl: maxPages,

      // 请求超时设置
      requestHandlerTimeoutSecs: 60,
      navigationTimeoutSecs: 60,

      // 速率限制
      maxRequestsPerMinute: 60,

      // 并发设置
      autoscaledPoolOptions: {
        minConcurrency: 1,
        maxConcurrency: 5,
      },
    },
    config
  )

  try {
    await crawler.run([url])

    // 爬取完成后导出结果
    console.log("\n✅ 爬取完成!")

    // 获取爬取的数据
    const data = await Dataset.getData()
    const itemCount = data.items.length

    console.log(`\n📊 爬取统计:`)
    console.log(`   总页面数：${itemCount}`)

    // 导出为 JSON 文件
    const exportPath = path.join(saveDir, "crawled_data.json")
    fs.writeFileSync(exportPath, JSON.stringify(data.items, null, 2), "utf-8")
    console.log(`   导出数据：${exportPath}`)

    // 删除 Crawlee 生成的临时文件夹（datasets、key_value_stores、request_queues）
    const dirsToDelete = ["datasets", "key_value_stores", "request_queues"]
    for (const dir of dirsToDelete) {
      const dirPath = path.join(saveDir, dir)
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true })
        console.log(`   已删除：${dir}/`)
      }
    }

    return { exportPath, itemCount }
  } catch (error) {
    console.error("\n❌ 爬取失败:", error.message)
    throw error
  }
}
