import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface YtDlpVideoInfo {
  id: string;
  title: string;
  duration: number;
  thumbnail?: string;
  requested_subtitles?: Record<string, { url?: string; ext: string; data?: string }>;
  _filename?: string;
  [key: string]: unknown;
}

export interface YtDlpOptions {
  format?: string;
  outtmpl?: string;
  postprocessors?: Array<{
    key: string;
    preferredcodec?: string;
    preferredquality?: string;
  }>;
  noplaylist?: boolean;
  quiet?: boolean;
  writesubtitles?: boolean;
  writeautomaticsub?: boolean;
  subtitleslangs?: string[];
  subtitlesformat?: string;
  skip_download?: boolean;
  cookiefile?: string;
  merge_output_format?: string;
  [key: string]: unknown;
}


// yt-dlp 二进制文件路径：core/bin/yt-dlp.exe
const ytDlpPath = path.join(__dirname, '..', '..', 'bin', 'yt-dlp.exe');

/**
 * 跨平台 yt-dlp 调用类
 */
export class YtDlp {
  private binaryPath: string;

  constructor(binaryPath?: string) {
    if (binaryPath) {
      this.binaryPath = binaryPath;
    } else {
      // 自动查找 yt-dlp 二进制文件
      this.binaryPath = this.findYtDlpBinary() || ytDlpPath;
    }

    if (!fs.existsSync(this.binaryPath)) {
      throw new Error(`yt-dlp 二进制文件未找到：${this.binaryPath}`);
    }
  }

  /**
   * 查找 yt-dlp 二进制文件
   */
  private findYtDlpBinary(): string {
    const possiblePaths: string[] = [];

    // 1. core/bin 目录（直接放置）
    const coreBinDir = path.join(__dirname, '..', '..', 'bin');
    possiblePaths.push(path.join(coreBinDir, 'yt-dlp.exe'));

    // 2. yt-dlp 子目录结构（bin/yt-dlp/yt-dlp.exe）
    const ytDlpSubDir = path.join(coreBinDir, 'yt-dlp');
    possiblePaths.push(path.join(ytDlpSubDir, 'yt-dlp.exe'));

    // 3. 系统 PATH 中的 yt-dlp
    possiblePaths.push('yt-dlp');
    possiblePaths.push('yt-dlp.exe');

    // 6. 常见全局安装位置
    if (process.platform === 'win32') {
      const appData = process.env.APPDATA;
      if (appData) {
        possiblePaths.push(path.join(appData, 'npm', 'yt-dlp.exe'));
      }
    } else if (process.platform === 'darwin') {
      possiblePaths.push('/usr/local/bin/yt-dlp');
      possiblePaths.push('/opt/homebrew/bin/yt-dlp');
    } else {
      possiblePaths.push('/usr/bin/yt-dlp');
      possiblePaths.push('/usr/local/bin/yt-dlp');
    }

    // 查找第一个存在的路径
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // 默认返回 yt-dlp，让系统 PATH 查找
    return process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  }

  /**
   * 构建 yt-dlp 命令行参数
   */
  private buildArgs(options: YtDlpOptions): string[] {
    const args: string[] = [];

    // 特殊参数映射
    const argMap: Record<string, string> = {
      outtmpl: '--output',
      postprocessors: '--postprocessor-args',
      postprocessor_args: '--postprocessor-args',
      subtitleslangs: '--sub-langs',
      subtitlesformat: '--sub-format',
      writeautomaticsub: '--write-auto-sub',
      writesubtitles: '--write-sub',
      cookiefile: '--cookies',
      merge_output_format: '--merge-output-format',
      noplaylist: '--no-playlist',
      quiet: '--quiet',
      skip_download: '--skip-download',
      format: '--format',
      extract_flat: '--extract-flat',
      ffmpegLocation: '--ffmpeg-location',
    };

    for (const [key, value] of Object.entries(options)) {
      // 跳过 url
      if (key === 'url') continue;

      // 获取参数名
      let argName = argMap[key];

      if (!argName) {
        // 默认转换：驼峰转短横线
        argName = `--${key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`;
      }

      if (typeof value === 'boolean') {
        if (value) {
          args.push(argName);
        }
      } else if (Array.isArray(value)) {
        if (key === 'subtitleslangs') {
          args.push(argName, value.join(','));
        } else if (key === 'postprocessors' || key === 'postprocessor_args') {
          // 处理 postprocessors - 音频提取
          for (const pp of value as Array<Record<string, unknown>>) {
            if (pp.key === 'FFmpegExtractAudio') {
              args.push('--extract-audio');
              if (pp.preferredcodec) {
                args.push('--audio-format', String(pp.preferredcodec));
              }
              if (pp.preferredquality) {
                args.push('--audio-quality', String(pp.preferredquality));
              }
            }
          }
        }
      } else if (value !== undefined && value !== null) {
        args.push(argName, String(value));
      }
    }

    return args;
  }

  /**
   * 执行 yt-dlp 命令
   */
  private async exec(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      // Windows 下需要处理特殊字符，使用 shell: false 避免 & | 等字符被解释
      const process = spawn(this.binaryPath, args, {
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`yt-dlp 退出码：${code}\n${stderr}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * 获取视频信息
   */
  async getVideoInfo(url: string): Promise<YtDlpVideoInfo> {
    const args = ['--dump-json', '--no-download', '--no-warnings', url];
    const output = await this.exec(args);
    return JSON.parse(output) as YtDlpVideoInfo;
  }

  /**
   * 下载视频/音频
   * @param url 视频 URL
   * @param options 下载选项
   * @param fetchMetadata 是否同时获取视频元数据（默认 false）
   * @returns 如果 fetchMetadata 为 true，返回 YtDlpVideoInfo；否则返回 void
   */
  async download(
    url: string,
    options: YtDlpOptions,
    fetchMetadata: false
  ): Promise<void>;
  async download(
    url: string,
    options: YtDlpOptions,
    fetchMetadata: true
  ): Promise<YtDlpVideoInfo>;
  async download(
    url: string,
    options: YtDlpOptions,
    fetchMetadata: boolean = false
  ): Promise<void | YtDlpVideoInfo> {
    // 如果需要获取元数据，先调用 getVideoInfo
    let metadata: YtDlpVideoInfo | undefined;
    if (fetchMetadata) {
      metadata = await this.getVideoInfo(url);
    }

    const args = [...this.buildArgs(options), url];
    await this.exec(args);

    return metadata;
  }

  /**
   * 获取 yt-dlp 版本
   */
  async getVersion(): Promise<string> {
    const output = await this.exec(['--version']);
    return output.trim();
  }

  /**
   * 获取帮助信息
   */
  async getHelp(): Promise<string> {
    return this.exec(['--help']);
  }

  /**
   * 获取支持的提取器
   */
  async getExtractors(): Promise<string[]> {
    const output = await this.exec(['--list-extractors']);
    return output.split('\n').filter((line) => line.trim());
  }
}

export default YtDlp;
