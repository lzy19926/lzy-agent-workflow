import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface FFmpegOptions {
  input?: string;
  output?: string;
  audioCodec?: string;
  videoCodec?: string;
  audioBitrate?: string;
  videoBitrate?: string;
  audioFrequency?: number;
  channels?: number;
  duration?: number;
  startTime?: number;
  endTime?: number;
  scale?: { width: number; height: number };
  format?: string;
  extraArgs?: string[];
  [key: string]: unknown;
}

export interface FFprobeResult {
  streams: Array<{
    index: number;
    codec_name: string;
    codec_type: string;
    duration?: number;
    tags?: Record<string, string>;
  }>;
  format: {
    duration?: number;
    bit_rate?: string;
    tags?: Record<string, string>;
  };
}

/**
 * 跨平台 FFmpeg 调用类
 */
export class FFmpeg {
  private ffmpegPath: string;
  private ffprobePath: string;

  constructor(ffmpegPath?: string, ffprobePath?: string, skipCheck: boolean = false) {
    if (ffmpegPath) {
      this.ffmpegPath = ffmpegPath;
    } else {
      this.ffmpegPath = this.findFFmpegBinary();
    }

    if (ffprobePath) {
      this.ffprobePath = ffprobePath;
    } else {
      this.ffprobePath = this.findFFprobeBinary();
    }

    if (!skipCheck) {
      if (!fs.existsSync(this.ffmpegPath)) {
        throw new Error(`ffmpeg 二进制文件未找到：${this.ffmpegPath}`);
      }

      if (!fs.existsSync(this.ffprobePath)) {
        throw new Error(`ffprobe 二进制文件未找到：${this.ffprobePath}`);
      }
    }
  }

  /**
   * 查找 ffmpeg 二进制文件
   */
  private findFFmpegBinary(): string {
    const possiblePaths: string[] = [];

    // 1. core/bin 目录（直接放置）
    const coreBinDir = path.join(__dirname, '..', '..', 'bin');
    possiblePaths.push(
      process.platform === 'win32'
        ? path.join(coreBinDir, 'ffmpeg.exe')
        : path.join(coreBinDir, 'ffmpeg')
    );

    // 2. FFmpeg 子目录结构（bin/ffmpeg/bin/ffmpeg.exe）
    const ffmpegSubDir = path.join(coreBinDir, 'ffmpeg', 'bin');
    possiblePaths.push(
      process.platform === 'win32'
        ? path.join(ffmpegSubDir, 'ffmpeg.exe')
        : path.join(ffmpegSubDir, 'ffmpeg')
    );

    // 3. 系统 PATH
    possiblePaths.push(process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

    // 5. 系统 PATH
    possiblePaths.push(process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

    // 查找第一个存在的路径
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  }

  /**
   * 查找 ffprobe 二进制文件
   */
  private findFFprobeBinary(): string {
    const possiblePaths: string[] = [];

    // 1. core/bin 目录（直接放置）
    const coreBinDir = path.join(__dirname, '..', '..', 'bin');
    possiblePaths.push(
      process.platform === 'win32'
        ? path.join(coreBinDir, 'ffprobe.exe')
        : path.join(coreBinDir, 'ffprobe')
    );

    // 2. FFmpeg 子目录结构（bin/ffmpeg/bin/ffprobe.exe）
    const ffmpegSubDir = path.join(coreBinDir, 'ffmpeg', 'bin');
    possiblePaths.push(
      process.platform === 'win32'
        ? path.join(ffmpegSubDir, 'ffprobe.exe')
        : path.join(ffmpegSubDir, 'ffprobe')
    );

    // 3. 系统 PATH
    possiblePaths.push(process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');

    // 查找第一个存在的路径
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
  }

  /**
   * 构建 ffmpeg 命令行参数
   */
  private buildArgs(options: FFmpegOptions): string[] {
    const args: string[] = ['-y']; // 覆盖输出文件

    // 输入文件
    if (options.input) {
      args.push('-i', options.input);
    }

    // 开始/结束时间
    if (options.startTime !== undefined) {
      args.push('-ss', String(options.startTime));
    }
    if (options.endTime !== undefined) {
      args.push('-to', String(options.endTime));
    }
    if (options.duration !== undefined) {
      args.push('-t', String(options.duration));
    }

    // 视频编码
    if (options.videoCodec) {
      args.push('-c:v', options.videoCodec);
    }
    if (options.videoBitrate) {
      args.push('-b:v', options.videoBitrate);
    }

    // 音频编码
    if (options.audioCodec) {
      args.push('-c:a', options.audioCodec);
    }
    if (options.audioBitrate) {
      args.push('-b:a', options.audioBitrate);
    }
    if (options.audioFrequency) {
      args.push('-ar', String(options.audioFrequency));
    }
    if (options.channels) {
      args.push('-ac', String(options.channels));
    }

    // 缩放
    if (options.scale) {
      args.push('-vf', `scale=${options.scale.width}:${options.scale.height}`);
    }

    // 格式
    if (options.format) {
      args.push('-f', options.format);
    }

    // 额外参数
    if (options.extraArgs) {
      args.push(...options.extraArgs);
    }

    // 输出文件
    if (options.output) {
      args.push(options.output);
    }

    return args;
  }

  /**
   * 执行 ffmpeg 命令
   */
  private async exec(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args, {
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0 || code === 1) {
          // FFmpeg 有时会以 1 退出但仍成功
          resolve(stderr);
        } else {
          reject(new Error(`ffmpeg 退出码：${code}\n${stderr}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * 转换媒体文件
   */
  async convert(input: string, output: string, options: Partial<FFmpegOptions> = {}): Promise<void> {
    const args = this.buildArgs({ ...options, input, output });
    await this.exec(args);
  }

  /**
   * 提取音频
   */
  async extractAudio(
    input: string,
    output: string,
    codec: string = 'mp3',
    bitrate: string = '128k'
  ): Promise<void> {
    const args = this.buildArgs({
      input,
      output,
      audioCodec: codec === 'mp3' ? 'libmp3lame' : codec,
      audioBitrate: bitrate,
      extraArgs: ['-vn'], // 禁用视频
    });
    await this.exec(args);
  }

  /**
   * 提取视频（无声）
   */
  async extractVideo(
    input: string,
    output: string,
    codec: string = 'h264'
  ): Promise<void> {
    const args = this.buildArgs({
      input,
      output,
      videoCodec: codec,
      extraArgs: ['-an'], // 禁用音频
    });
    await this.exec(args);
  }

  /**
   * 剪切媒体
   */
  async cut(
    input: string,
    output: string,
    startTime: number,
    duration: number
  ): Promise<void> {
    const args = this.buildArgs({
      input,
      output,
      startTime,
      duration,
    });
    await this.exec(args);
  }

  /**
   * 合并媒体文件
   */
  async merge(inputs: string[], output: string): Promise<void> {
    if (inputs.length === 0) {
      throw new Error('至少需要一个输入文件');
    }

    const args: string[] = ['-y'];

    // 添加所有输入文件
    for (const input of inputs) {
      args.push('-i', input);
    }

    // 添加 concat 协议参数
    args.push('-c', 'copy');
    args.push(output);

    await this.exec(args);
  }

  /**
   * 获取媒体信息（使用 ffprobe）
   */
  async getMediaInfo(input: string): Promise<FFprobeResult> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        input,
      ];

      const process = spawn(this.ffprobePath, args, {
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
          try {
            resolve(JSON.parse(stdout) as FFprobeResult);
          } catch (e) {
            reject(new Error(`解析 ffprobe 输出失败：${stderr}`));
          }
        } else {
          reject(new Error(`ffprobe 退出码：${code}\n${stderr}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * 获取媒体时长
   */
  async getDuration(input: string): Promise<number> {
    const info = await this.getMediaInfo(input);
    return info.format.duration || 0;
  }

  /**
   * 获取版本信息
   */
  async getVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, ['-version'], {
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdout = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`获取版本失败，退出码：${code}`));
        }
      });
    });
  }
}

export default FFmpeg;
