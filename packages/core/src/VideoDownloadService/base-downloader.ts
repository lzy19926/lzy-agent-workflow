import EventEmitter from "events"
import type {
  DownloadQuality,
  ProgressEvent,
  DownloadMetadata,
  AudioDownloadResult,
  TranscriptResult,
} from "./types"
import type { DownloaderConfig } from "./types"

/**
 * 平台下载器抽象基类
 * 每个视频平台（B 站、YouTube 等）需要实现自己的 Downloader
 */
export abstract class BaseDownloader extends EventEmitter {
  protected quality: string
  protected config?: Partial<DownloaderConfig>

  constructor(config?: Partial<DownloaderConfig>) {
    super()
    this.config = config
    const qualityMap: Record<DownloadQuality, string> = {
      fast: "32",
      medium: "64",
      slow: "128",
    }
    this.quality = qualityMap[config?.quality || "fast"]
  }

  protected emitProgress(event: ProgressEvent): void {
    this.emit("progress", event)
  }

  /**
   * 判断当前下载器是否支持该视频链接
   * @param videoUrl 视频链接
   * @returns 是否支持
   */
  abstract supports(videoUrl: string): boolean

  /**
   * 获取视频元数据
   * @param videoUrl 视频链接
   * @returns 视频元数据
   */
  abstract getMetadata(videoUrl: string): Promise<DownloadMetadata>

  /**
   * 下载音频
   * @param videoUrl - 资源链接
   * @param outputDir - 输出路径
   * @param quality - 音频质量 fast | medium | slow
   * @returns 返回一个 AudioDownloadResult
   */
  abstract downloadAudio(
    videoUrl: string,
    outputDir?: string,
    quality?: DownloadQuality
  ): Promise<AudioDownloadResult>

  /**
   * 下载视频
   * @param videoUrl - 视频链接
   * @param outputDir - 输出路径
   * @returns 视频文件路径
   */
  abstract downloadVideo(videoUrl: string, outputDir?: string): Promise<string>

  /**
   * 删除视频文件
   * @param videoPath - 视频文件路径
   * @returns 操作结果
   */
  abstract deleteVideo(videoPath: string): Promise<string>

  /**
   * 获取字幕
   * @param videoUrl - 视频链接
   * @param outputDir - 输出路径
   * @param langs - 优先语言列表
   * @returns TranscriptResult 或 null
   */
  abstract downloadSubtitles(
    videoUrl: string,
    outputDir?: string,
    langs?: string[]
  ): Promise<TranscriptResult | null>
}
