import type {
  DownloadMetadata,
  BilibiliPlatformConfig,
  DownloadQuality,
  AudioDownloadResult,
  TranscriptResult,
  TranscriptSegment,
  DownloadAllResult,
} from "./types"
import { DEFAULT_CONFIG } from "./types"
import { BaseDownloader } from "./base-downloader"
import path from "path"
import fs from "fs"
import YtDlp, { YtDlpVideoInfo } from "../tools/yt-dlp"
import FFmpeg from "../tools/ffmpeg"

interface SubtitleInfo {
  url?: string
  ext: string
  data?: string
}

export interface BilibiliDownloaderOptions {
  config?: Partial<BilibiliPlatformConfig>
}

export class BilibiliDownloader extends BaseDownloader {
  private platformConfig: BilibiliPlatformConfig
  private ytDlp: YtDlp
  private ffmpeg: FFmpeg
  private ffmpegPath: string

  constructor(options?: BilibiliDownloaderOptions) {
    super()

    // 合并配置
    this.platformConfig = {
      ...DEFAULT_CONFIG.platforms.bilibili,
      ...options?.config,
    }

    this.ffmpeg = new FFmpeg(undefined, undefined, true)
    this.ffmpegPath = this.getFFmpegPath()
    this.ytDlp = new YtDlp()
  }

  /**
   * 判断是否支持该视频链接（B 站）
   */
  supports(videoUrl: string): boolean {
    return videoUrl.includes("bilibili.com") || videoUrl.includes("b23.tv")
  }

  /**
   * 获取视频元数据
   */
  async getMetadata(videoUrl: string): Promise<DownloadMetadata> {
    const info = await this.ytDlp.getVideoInfo(videoUrl)
    return {
      videoId: info.id,
      title: info.title,
      duration: info.duration || 0,
      thumbnail: info.thumbnail,
      platform: "bilibili",
    }
  }

  private getFFmpegPath(): string {
    // 获取 ffmpeg 路径，用于 yt-dlp 的后处理
    const possiblePaths: string[] = []

    const projectBinDir = path.join(process.cwd(), "bin")
    const ffmpegSubDir = path.join(projectBinDir, "ffmpeg", "bin")
    possiblePaths.push(path.join(ffmpegSubDir, "ffmpeg.exe"))
    possiblePaths.push(path.join(projectBinDir, "ffmpeg.exe"))

    const currentBinDir = path.join(__dirname, "..", "..", "..", "bin")
    const currentFfmpegSubDir = path.join(currentBinDir, "ffmpeg", "bin")
    possiblePaths.push(path.join(currentFfmpegSubDir, "ffmpeg.exe"))
    possiblePaths.push(path.join(currentBinDir, "ffmpeg.exe"))

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p
      }
    }

    return "ffmpeg"
  }

  /**
   * 下载音频文件
   * @param videoUrl 视频 URL
   * @param outputDir 输出目录
   * @param quality 音频质量（未使用，保留接口兼容）
   * @returns 音频下载结果
   */
  async downloadAudio(
    videoUrl: string,
    outputDir?: string,
    quality: DownloadQuality = DEFAULT_CONFIG.quality
  ): Promise<AudioDownloadResult> {
    if (!outputDir) {
      outputDir = DEFAULT_CONFIG.outputDir
    }

    fs.mkdirSync(outputDir, { recursive: true })

    // 使用 yt-dlp 下载最佳音频
    const outputPath = path.join(outputDir, "%(id)s.%(ext)s")

    const ydlOpts: Record<string, unknown> = {
      format: "bestaudio[ext=m4a]/bestaudio/best",
      outtmpl: outputPath,
      noplaylist: true,
      quiet: false,
      // 指定 FFmpeg 路径
      ffmpegLocation: this.ffmpegPath,
    }

    // 获取视频元数据并执行下载（一次调用完成）
    const info = await this.getVideoInfoWithDownload(videoUrl, ydlOpts)

    const videoId = info.id
    const title = info.title
    const duration = info.duration || 0
    const coverUrl = info.thumbnail

    // 使用 FFmpeg 转换格式（如果需要）
    const tempFile = path.join(outputDir, `${videoId}.m4a`)
    const audioPath = path.join(
      outputDir,
      `${videoId}.${this.platformConfig.audioFormat}`
    )

    if (fs.existsSync(tempFile)) {
      if (
        this.platformConfig.audioFormat !== "m4a" ||
        !fs.existsSync(audioPath)
      ) {
        await this.ffmpeg.extractAudio(
          tempFile,
          audioPath,
          this.platformConfig.audioFormat === "mp3" ? "mp3" : "aac",
          "128k"
        )
      }
    }

    // 如果需要下载封面
    if (this.platformConfig.downloadCover && coverUrl) {
      // 确保使用 https
      const httpsUrl = coverUrl.replace("http://", "https://")
      const coverExt = path.extname(httpsUrl.split("?")[0]) || ".jpg"
      const coverPath = path.join(outputDir, `${videoId}_cover${coverExt}`)
      if (!fs.existsSync(coverPath)) {
        const https = await import("https")
        const file = fs.createWriteStream(coverPath)
        await new Promise<void>((resolve, reject) => {
          https
            .get(httpsUrl, (res) => {
              res.pipe(file)
              file.on("finish", () => {
                file.close()
                resolve()
              })
            })
            .on("error", reject)
        })
      }
    }

    return {
      filePath: audioPath,
      title,
      duration,
      coverUrl,
      platform: "bilibili",
      videoId,
      rawInfo: info,
    }
  }

  /**
   * @deprecated 使用 downloadAudio 代替
   */
  async download(
    videoUrl: string,
    outputDir?: string,
    quality: DownloadQuality = DEFAULT_CONFIG.quality,
    needVideo?: boolean
  ): Promise<AudioDownloadResult> {
    return this.downloadAudio(videoUrl, outputDir, quality)
  }

  async downloadVideo(videoUrl: string, outputDir?: string): Promise<string> {
    if (!outputDir) {
      outputDir = DEFAULT_CONFIG.outputDir
    }

    fs.mkdirSync(outputDir, { recursive: true })

    const outputPath = path.join(outputDir, "%(id)s.%(ext)s")

    // 下载音视频合并的格式，确保有音频流
    const ydlOpts: Record<string, unknown> = {
      format:
        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best",
      outtmpl: outputPath,
      noplaylist: true,
      quiet: false,
      merge_output_format: "mp4",
    }

    // 获取视频信息并执行下载
    const info = await this.getVideoInfoWithDownload(videoUrl, ydlOpts)
    const videoId = info.id

    // 查找并转换格式（支持多种可能的文件名）
    const videoPath = path.join(
      outputDir,
      `${videoId}.${this.platformConfig.videoFormat}`
    )

    // 可能的临时文件名（yt-dlp 可能生成带格式 ID 的文件）
    const possibleTempFiles = [
      path.join(outputDir, `${videoId}.mp4`),
      path.join(outputDir, `${videoId}.f*.mp4`), // 通配符模式
    ]

    // 查找实际存在的文件
    let tempFile: string | null = null
    const files = fs.readdirSync(outputDir)
    for (const file of files) {
      if (
        file.startsWith(videoId) &&
        file.endsWith(".mp4") &&
        file !== path.basename(videoPath)
      ) {
        tempFile = path.join(outputDir, file)
        break
      }
    }

    if (tempFile) {
      if (tempFile !== videoPath) {
        await this.ffmpeg.convert(tempFile, videoPath, {
          videoCodec: "libx264",
          audioCodec: "aac",
        })
      }
    }

    if (!fs.existsSync(videoPath)) {
      throw new Error(`视频文件未找到：${videoPath}`)
    }

    return videoPath
  }

  async deleteVideo(videoPath: string): Promise<string> {
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath)
      return `视频文件已删除：${videoPath}`
    } else {
      return `视频文件未找到：${videoPath}`
    }
  }

  async downloadSubtitles(
    videoUrl: string,
    outputDir?: string,
    langs?: string[]
  ): Promise<TranscriptResult | null> {
    if (!outputDir) {
      outputDir = DEFAULT_CONFIG.outputDir
    }

    fs.mkdirSync(outputDir, { recursive: true })

    if (!langs) {
      langs = DEFAULT_CONFIG.subtitleLangs
    }

    const videoId = this.extractVideoId(videoUrl)

    const ydlOpts: Record<string, unknown> = {
      writesubtitles: this.platformConfig.fetchSubtitles,
      writeautomaticsub: this.platformConfig.fetchSubtitles,
      subtitleslangs: langs,
      subtitlesformat: "srt/json3/best",
      skip_download: true,
      outtmpl: path.join(outputDir, `${videoId}.%(ext)s`),
      quiet: true,
    }

    if (this.platformConfig.cookiesFile) {
      const cookiesPath = path.resolve(this.platformConfig.cookiesFile)
      if (fs.existsSync(cookiesPath)) {
        ydlOpts.cookiefile = cookiesPath
      }
    }

    try {
      const info = await this.runYtDlp<YtDlpVideoInfo>(videoUrl, ydlOpts)

      // 查找下载的字幕
      const subtitles = info.requested_subtitles || {}
      if (Object.keys(subtitles).length === 0) {
        console.log(`B 站视频 ${videoId} 没有可用字幕`)
        return null
      }

      // 按优先级查找字幕
      let detectedLang: string | undefined
      let subInfo: SubtitleInfo | undefined

      for (const lang of langs) {
        if (subtitles[lang]) {
          detectedLang = lang
          subInfo = subtitles[lang]
          break
        }
      }

      // 如果按优先级没找到，取第一个可用的（排除弹幕）
      if (!detectedLang) {
        for (const [lang, infoItem] of Object.entries(subtitles)) {
          if (lang !== "danmaku") {
            detectedLang = lang
            subInfo = infoItem as SubtitleInfo
            break
          }
        }
      }

      if (!subInfo) {
        console.log(`B 站视频 ${videoId} 没有可用字幕（排除弹幕）`)
        return null
      }

      // 检查是否有内嵌数据
      if (subInfo.data && detectedLang) {
        console.log(`直接从返回数据解析字幕：${detectedLang}`)
        return this.parseSrtContent(subInfo.data, detectedLang)
      }

      // 查找字幕文件
      const ext = subInfo.ext || "srt"
      const subtitleFile = path.join(
        outputDir,
        `${videoId}.${detectedLang || "zh"}.${ext}`
      )

      if (!fs.existsSync(subtitleFile)) {
        console.log(`字幕文件不存在：${subtitleFile}`)
        return null
      }

      // 根据格式解析字幕文件
      if (ext === "json3") {
        return this.parseJson3Subtitle(subtitleFile, detectedLang || "zh")
      } else {
        const content = fs.readFileSync(subtitleFile, "utf-8")
        return this.parseSrtContent(content, detectedLang || "zh")
      }
    } catch (e) {
      console.warn(`获取 B 站字幕失败：${e}`)
      return null
    }
  }

  private parseSrtContent(
    srtContent: string,
    language: string
  ): TranscriptResult | null {
    try {
      const segments: TranscriptSegment[] = []
      // SRT 格式：序号\n时间戳\n文本\n\n
      const pattern =
        /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\n|\n\d+\n|$)/gs

      let match: RegExpExecArray | null
      while ((match = pattern.exec(srtContent)) !== null) {
        const [, , startStr, endStr, text] = match
        const trimmedText = text.trim()
        if (!trimmedText) continue

        // 转换时间格式 00:00:00,000 -> 秒
        const timeToSeconds = (t: string): number => {
          const normalized = t.replace(",", ".")
          const parts = normalized.split(":")
          return (
            parseFloat(parts[0]) * 3600 +
            parseFloat(parts[1]) * 60 +
            parseFloat(parts[2])
          )
        }

        segments.push({
          start: timeToSeconds(startStr),
          end: timeToSeconds(endStr),
          text: trimmedText,
        })
      }

      if (segments.length === 0) {
        return null
      }

      const fullText = segments.map((seg) => seg.text).join(" ")
      console.log(`成功解析 B 站 SRT 字幕，共 ${segments.length} 段`)

      return {
        language,
        fullText,
        segments,
        raw: { source: "bilibili_subtitle", format: "srt" },
      }
    } catch (e) {
      console.warn(`解析 SRT 字幕失败：${e}`)
      return null
    }
  }

  private parseJson3Subtitle(
    subtitleFile: string,
    language: string
  ): TranscriptResult | null {
    try {
      const content = fs.readFileSync(subtitleFile, "utf-8")
      const data = JSON.parse(content)

      const segments: TranscriptSegment[] = []
      const events = data.events || []

      for (const event of events) {
        const startMs = event.tStartMs || 0
        const durationMs = event.dDurationMs || 0

        // 提取文本
        const segs = event.segs || []
        const text = segs
          .map((seg: { utf8?: string }) => seg.utf8 || "")
          .join("")
          .trim()

        if (text) {
          segments.push({
            start: startMs / 1000.0,
            end: (startMs + durationMs) / 1000.0,
            text,
          })
        }
      }

      if (segments.length === 0) {
        return null
      }

      const fullText = segments.map((seg) => seg.text).join(" ")
      console.log(`成功解析 B 站字幕，共 ${segments.length} 段`)

      return {
        language,
        fullText,
        segments,
        raw: { source: "bilibili_subtitle", file: subtitleFile },
      }
    } catch (e) {
      console.warn(`解析字幕文件失败：${e}`)
      return null
    }
  }

  private extractVideoId(url: string): string {
    // B 站视频链接格式：https://www.bilibili.com/video/BVxxxxxx
    // 或 https://b23.tv/xxxxx
    const bvPattern = /BV[a-zA-Z0-9]+/
    const match = url.match(bvPattern)
    if (match) {
      return match[0]
    }

    // 如果是 av 号
    const avPattern = /av(\d+)/
    const avMatch = url.match(avPattern)
    if (avMatch) {
      return `av${avMatch[1]}`
    }

    // 短链接需要解析，这里简单返回 URL 本身作为 ID
    return url.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 50)
  }

  private async runYtDlp<T>(
    url: string,
    options: Record<string, unknown>
  ): Promise<T> {
    try {
      // 使用 yt-dlp 获取视频信息
      const info = await this.ytDlp.getVideoInfo(url)
      return info as T
    } catch (error) {
      console.error(
        "yt-dlp 执行失败:",
        error instanceof Error ? error.message : error
      )
      throw error
    }
  }

  private async getVideoInfoWithDownload(
    url: string,
    options: Record<string, unknown>
  ): Promise<YtDlpVideoInfo> {
    // 先获取视频元数据
    const info = await this.ytDlp.getVideoInfo(url)

    // 然后执行下载
    await this.ytDlp.download(url, options as any, false)

    return info
  }

  private async downloadWithProgress(
    url: string,
    options: Record<string, unknown>,
    fetchMetadata: boolean = false
  ): Promise<YtDlpVideoInfo | void> {
    try {
      // 如果需要获取元数据，先调用 getVideoInfo
      let info: YtDlpVideoInfo | undefined
      if (fetchMetadata) {
        info = await this.ytDlp.getVideoInfo(url)
      }

      // 使用 yt-dlp 下载
      await this.ytDlp.download(url, options as any, false)

      return info
    } catch (error) {
      console.error(
        "yt-dlp 下载失败:",
        error instanceof Error ? error.message : error
      )
      throw error
    }
  }

  /**
   * 完整下载流程：先音频 → 再视频 → 最后字幕
   * 1. 首先下载音频文件（使用 yt-dlp 直接下载音频流）
   * 2. 然后下载视频文件
   * 3. 最后下载字幕文件
   */
  async downloadAll(
    videoUrl: string,
    outputDir?: string
  ): Promise<DownloadAllResult> {
    if (!outputDir) {
      outputDir = DEFAULT_CONFIG.outputDir
    }

    fs.mkdirSync(outputDir, { recursive: true })

    const result: DownloadAllResult = {
      hasSubtitle: false,
    }

    // 步骤 1: 下载音频文件
    console.log("【步骤 1/3】正在下载音频...")
    const audioResult = await this.downloadAudio(videoUrl, outputDir)
    result.audioPath = audioResult.filePath
    result.title = audioResult.title
    result.duration = audioResult.duration
    console.log(`✓ 音频下载完成：${audioResult.filePath}`)

    // 步骤 2: 下载视频文件
    console.log("【步骤 2/3】正在下载视频...")
    const videoPath = await this.downloadVideo(videoUrl, outputDir)
    result.videoPath = videoPath
    console.log(`✓ 视频下载完成：${videoPath}`)

    // 下载封面（如果配置开启）
    if (this.platformConfig.downloadCover && audioResult.coverUrl) {
      const coverExt =
        path.extname(audioResult.coverUrl.split("?")[0]) || ".jpg"
      const coverPath = path.join(
        outputDir,
        `${audioResult.videoId}_cover${coverExt}`
      )
      if (!fs.existsSync(coverPath)) {
        const https = await import("https")
        const file = fs.createWriteStream(coverPath)
        await new Promise<void>((resolve, reject) => {
          https
            .get(audioResult.coverUrl!, (res) => {
              res.pipe(file)
              file.on("finish", () => {
                file.close()
                resolve()
              })
            })
            .on("error", reject)
        })
        console.log(`✓ 封面下载完成：${coverPath}`)
      }
    }

    // 步骤 3: 下载字幕
    console.log("【步骤 3/3】正在获取字幕...")
    const subtitle = await this.downloadSubtitles(videoUrl, outputDir)

    if (subtitle) {
      result.hasSubtitle = true
      result.subtitle = subtitle
      console.log(`✓ 字幕获取成功，共 ${subtitle.segments.length} 段`)
    } else {
      console.log("  该视频没有可用字幕")
    }

    return result
  }
}
