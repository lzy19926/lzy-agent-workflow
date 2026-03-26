import type {
  AudioDownloadResult,
  TranscriptResult,
  DownloadQuality,
  DownloadAllResult,
  DownloaderConfig,
} from "./types"
import { BaseDownloader, DEFAULT_CONFIG } from "./base-downloader"
import { BilibiliDownloader } from "./bilibili-downloader"
/**
 * 视频下载服务类
 * 负责初始化和管理多个平台 Downloader，根据视频链接自动选择合适的下载器
 */
export class VideoDownloadService {
  private downloaders: BaseDownloader[] = []
  private config: DownloaderConfig

  constructor(config?: Partial<DownloaderConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    }

    // 初始化所有平台下载器
    this.initDownloaders()
  }

  /**
   * 初始化所有平台下载器
   * 按需加载，只加载配置中启用的平台
   */
  private initDownloaders(): void {
    // 初始化 B 站下载器
    this.downloaders.push(
      new BilibiliDownloader({
        config: this.config.platforms.bilibili,
      })
    )

    // 未来可以在这里添加其他平台下载器
    // this.downloaders.push(new YoutubeDownloader({ ... }));
  }

  /**
   * 根据视频链接选择合适的下载器
   * @param videoUrl 视频链接
   * @returns 匹配的下载器
   */
  private getDownloader(videoUrl: string): BaseDownloader {
    const downloader = this.downloaders.find((d) => d.supports(videoUrl))
    if (!downloader) {
      throw new Error(`不支持的视频平台：${videoUrl}`)
    }
    return downloader
  }

  /**
   * 下载音频
   * @param videoUrl 视频链接
   * @param outputDir 输出目录
   * @param quality 音频质量
   * @returns 音频下载结果
   */
  async downloadAudio(
    videoUrl: string,
    outputDir?: string,
    quality?: DownloadQuality
  ): Promise<AudioDownloadResult> {
    const downloader = this.getDownloader(videoUrl)
    return downloader.downloadAudio(videoUrl, outputDir, quality)
  }

  /**
   * 下载视频
   * @param videoUrl 视频链接
   * @param outputDir 输出目录
   * @returns 视频文件路径
   */
  async downloadVideo(videoUrl: string, outputDir?: string): Promise<string> {
    const downloader = this.getDownloader(videoUrl)
    return downloader.downloadVideo(videoUrl, outputDir)
  }

  /**
   * 删除视频文件
   * @param videoPath 视频文件路径
   * @returns 操作结果
   */
  async deleteVideo(videoPath: string): Promise<string> {
    // 查找能处理该文件的下载器（通过路径匹配或遍历所有）
    for (const downloader of this.downloaders) {
      try {
        const result = await downloader.deleteVideo(videoPath)
        if (result) return result
      } catch {
        continue
      }
    }
    throw new Error(`无法删除视频文件，未找到合适的处理程序：${videoPath}`)
  }

  /**
   * 获取字幕
   * @param videoUrl 视频链接
   * @param outputDir 输出目录
   * @param langs 优先语言列表
   * @returns 字幕结果
   */
  async downloadSubtitles(
    videoUrl: string,
    outputDir?: string,
    langs?: string[]
  ): Promise<TranscriptResult | null> {
    const downloader = this.getDownloader(videoUrl)
    return downloader.downloadSubtitles(videoUrl, outputDir, langs)
  }

  /**
   * 完整下载流程：音频 + 视频 + 字幕
   * @param videoUrl 视频链接
   * @param outputDir 输出目录
   * @returns 下载结果
   */
  async downloadAll(
    videoUrl: string,
    outputDir?: string
  ): Promise<DownloadAllResult> {
    const downloader = this.getDownloader(videoUrl)

    // 复用 BilibiliDownloader 的 downloadAll 实现
    if (downloader instanceof BilibiliDownloader) {
      return (downloader as BilibiliDownloader).downloadAll(videoUrl, outputDir)
    }

    // 其他下载器的通用实现
    if (!outputDir) {
      outputDir = this.config.outputDir
    }

    const result: DownloadAllResult = {
      hasSubtitle: false,
    }

    const audioResult = await this.downloadAudio(videoUrl, outputDir)
    result.audioPath = audioResult.filePath
    result.title = audioResult.title
    result.duration = audioResult.duration

    result.videoPath = await this.downloadVideo(videoUrl, outputDir)

    const subtitle = await this.downloadSubtitles(videoUrl, outputDir)
    if (subtitle) {
      result.hasSubtitle = true
      result.subtitle = subtitle
    }

    return result
  }

  /**
   * 获取所有已注册的下载器
   */
  getRegisteredDownloaders(): BaseDownloader[] {
    return [...this.downloaders]
  }
}
