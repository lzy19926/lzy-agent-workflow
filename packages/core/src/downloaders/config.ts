export type DownloadQuality = 'fast' | 'medium' | 'slow';

export interface BilibiliPlatformConfig {
  cookiesFile?: string;
  videoFormat: string;
  audioFormat: string;
  downloadCover: boolean;
  fetchSubtitles: boolean;
}

export interface DownloaderConfig {
  outputDir: string;
  quality: DownloadQuality;
  needVideo: boolean;
  subtitleLangs: string[];
  platforms: {
    bilibili: BilibiliPlatformConfig;
  };
}

export const DEFAULT_CONFIG: DownloaderConfig = {
  outputDir: './downloads',
  quality: 'fast',
  needVideo: false,
  subtitleLangs: ['zh-Hans', 'zh', 'zh-CN', 'ai-zh', 'en', 'en-US'],
  platforms: {
    bilibili: {
      videoFormat: 'mp4',
      audioFormat: 'mp3',
      downloadCover: true,
      fetchSubtitles: true,
    },
  },
};
