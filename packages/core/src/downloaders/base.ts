import EventEmitter from 'events';
import { AudioDownloadResult, TranscriptResult, DownloadQuality } from './types';
import { DownloaderConfig } from './config';

export interface ProgressEvent {
  stage: 'downloading' | 'converting' | 'uploading' | 'transcribing' | 'processing' | 'complete';
  progress: number;
  message: string;
}

export abstract class Downloader extends EventEmitter {
  protected quality: string;
  protected cacheData?: string;
  protected config?: Partial<DownloaderConfig>;

  constructor(config?: Partial<DownloaderConfig>) {
    super();
    this.config = config;
    const qualityMap: Record<DownloadQuality, string> = {
      fast: '32',
      medium: '64',
      slow: '128'
    };
    this.quality = qualityMap[config?.quality || 'fast'];
    this.cacheData = process.env.DATA_DIR;
  }

  protected emitProgress(event: ProgressEvent): void {
    this.emit('progress', event);
  }

  /**
   * 下载音频
   * @param videoUrl - 资源链接
   * @param outputDir - 输出路径
   * @param quality - 音频质量 fast | medium | slow
   * @param needVideo - 是否需要视频
   * @returns 返回一个 AudioDownloadResult
   */
  abstract download(
    videoUrl: string,
    outputDir?: string,
    quality?: DownloadQuality,
    needVideo?: boolean
  ): Promise<AudioDownloadResult>;

  /**
   * 下载视频
   * @param videoUrl - 视频链接
   * @param outputDir - 输出路径
   * @returns 视频文件路径
   */
  abstract downloadVideo(videoUrl: string, outputDir?: string): Promise<string>;

  /**
   * 删除视频文件
   * @param videoPath - 视频文件路径
   * @returns 操作结果
   */
  abstract deleteVideo(videoPath: string): Promise<string>;

  /**
   * 尝试获取平台字幕
   * @param videoUrl - 视频链接
   * @param outputDir - 输出路径
   * @param langs - 优先语言列表
   * @returns TranscriptResult 或 null
   */
  async downloadSubtitles(
    videoUrl: string,
    outputDir?: string,
    langs?: string[]
  ): Promise<TranscriptResult | null> {
    return null;
  }
}
