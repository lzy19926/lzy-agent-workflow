// ==================== 类导出 ====================
export { VideoDownloadService } from "./VideoDownloadService"

// ==================== 类型导出 ====================
// 基础类型
export type {
  DownloadQuality,
  AudioDownloadResult,
  TranscriptSegment,
  TranscriptResult,
  DownloadAllResult,
  ProgressEvent,
  DownloadMetadata,
  DownloaderConfig,
  BilibiliPlatformConfig,
} from "./types"

// 下载器相关类型
export type { BilibiliDownloaderOptions } from "./bilibili-downloader"

// ==================== 常量导出 ====================
export { DEFAULT_CONFIG as VIDEO_DOWNLOAD_DEFAULT_CONFIG } from "./types"
