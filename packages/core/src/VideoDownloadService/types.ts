// ==================== 基础类型 ====================
export type DownloadQuality = "fast" | "medium" | "slow"

export interface AudioDownloadResult {
  filePath: string
  title: string
  duration: number
  coverUrl?: string
  platform: string
  videoId: string
  rawInfo?: unknown
  videoPath?: string | null
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptResult {
  language: string
  fullText: string
  segments: TranscriptSegment[]
  raw?: Record<string, unknown>
}

export interface DownloadAllResult {
  hasSubtitle: boolean
  subtitle?: TranscriptResult | null
  audioPath?: string
  videoPath?: string
  title?: string
  duration?: number
}

// ==================== 基类相关类型 ====================

export interface ProgressEvent {
  stage:
    | "downloading"
    | "converting"
    | "uploading"
    | "transcribing"
    | "processing"
    | "complete"
  progress: number
  message: string
}

export interface DownloadMetadata {
  videoId: string
  title: string
  duration: number
  thumbnail?: string
  platform: string
}

// ==================== 配置类型 ====================
export interface DownloaderConfig {
  outputDir: string
  quality: DownloadQuality
  needVideo: boolean
  subtitleLangs: string[]
  platforms: {
    bilibili: BilibiliPlatformConfig
  }
}

export interface BilibiliPlatformConfig {
  cookiesFile?: string
  videoFormat: string
  audioFormat: string
  downloadCover: boolean
  fetchSubtitles: boolean
}

export const DEFAULT_CONFIG: DownloaderConfig = {
  outputDir: "./downloads",
  quality: "fast",
  needVideo: false,
  subtitleLangs: ["zh-Hans", "zh", "zh-CN", "ai-zh", "en", "en-US"],
  platforms: {
    bilibili: {
      videoFormat: "mp4",
      audioFormat: "mp3",
      downloadCover: true,
      fetchSubtitles: true,
    },
  },
}
