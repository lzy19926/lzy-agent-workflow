export type DownloadQuality = 'fast' | 'medium' | 'slow';

export interface AudioDownloadResult {
  filePath: string;
  title: string;
  duration: number;
  coverUrl?: string;
  platform: string;
  videoId: string;
  rawInfo?: unknown;
  videoPath?: string | null;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResult {
  language: string;
  fullText: string;
  segments: TranscriptSegment[];
  raw?: Record<string, unknown>;
}

export interface DownloaderOptions {
  quality: DownloadQuality;
  cacheData?: string;
}

export interface DownloadAllResult {
  hasSubtitle: boolean;
  subtitle?: TranscriptResult | null;
  audioPath?: string;
  videoPath?: string;
  title?: string;
  duration?: number;
}
