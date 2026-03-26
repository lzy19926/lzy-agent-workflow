import OSS from 'ali-oss';
import path from 'path';
import fs from 'fs';
import type { StorageConfig, UploadOptions, UploadResult, FileInfo, FileListItem } from './types';

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Required<StorageConfig> = {
  accessKeyId: '',
  accessKeySecret: '',
  bucket: '',
  region: 'oss-cn-hangzhou',
  endpoint: '',
  authorizationV4: true,
  timeout: 300000,
  storageClass: 'Standard',
  acl: 'private',
};

/**
 * 文件上传服务
 *
 * 封装阿里云 OSS 文件上传功能，提供统一的文件上传接口
 * 支持上传本地文件、Buffer 数据
 *
 * 使用示例：
 * ```typescript
 * const uploadService = new FileUploadService({
 *   bucket: 'my-bucket',
 *   region: 'oss-cn-hangzhou',
 * });
 *
 * // 上传本地文件
 * const result = await uploadService.uploadFile('./audio.mp3');
 * console.log('文件 URL:', result.url);
 *
 * // 上传到指定目录
 * const result2 = await uploadService.uploadFile('./audio.mp3', {
 *   prefix: 'videos/2024',
 * });
 *
 * // 上传 Buffer
 * const buffer = fs.readFileSync('./data.txt');
 * const result3 = await uploadService.uploadBuffer(buffer, 'data.txt');
 * ```
 */
export class FileUploadService {
  private client: OSS;
  private config: Required<StorageConfig>;

  constructor(config: StorageConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      accessKeyId: config.accessKeyId || process.env.OSS_ACCESS_KEY_ID || '',
      accessKeySecret: config.accessKeySecret || process.env.OSS_ACCESS_KEY_SECRET || '',
      endpoint: config.endpoint || `https://${config.region}.aliyuncs.com`,
    };

    // 初始化 OSS 客户端
    this.client = new OSS({
      accessKeyId: this.config.accessKeyId,
      accessKeySecret: this.config.accessKeySecret,
      bucket: this.config.bucket,
      region: this.config.region,
      endpoint: this.config.endpoint,
      authorizationV4: this.config.authorizationV4,
      timeout: this.config.timeout,
    });
  }

  /**
   * 上传本地文件
   * @param filePath 本地文件路径
   * @param options 上传选项
   * @returns 上传结果
   */
  async uploadFile(filePath: string, options?: UploadOptions): Promise<UploadResult> {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`文件不存在：${absolutePath}`);
    }

    const stats = fs.statSync(absolutePath);
    if (!stats.isFile()) {
      throw new Error(`不是文件：${absolutePath}`);
    }

    const objectName = this.buildObjectName(filePath, options);
    const headers = this.buildHeaders(options);
    const fileStream = fs.createReadStream(absolutePath);

    const result = await this.client.put(objectName, fileStream, {
      headers,
    });

    return this.parseResult(result, objectName, stats.size);
  }

  /**
   * 上传 Buffer 数据
   * @param buffer 文件 Buffer
   * @param fileName 文件名（用于生成 objectName）
   * @param options 上传选项
   * @returns 上传结果
   */
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const objectName = this.buildObjectName(fileName, options);
    const headers = this.buildHeaders(options);

    const result = await this.client.put(objectName, buffer, {
      headers,
    });

    return this.parseResult(result, objectName, buffer.length);
  }

  /**
   * 构建文件对象名称
   */
  private buildObjectName(filePath: string, options?: UploadOptions): string {
    // 如果选项中指定了 objectName，直接使用
    if (options?.objectName) {
      return options.objectName;
    }

    // 否则根据文件名和前缀生成
    const fileName = path.basename(filePath);
    const prefix = options?.prefix ? options.prefix.replace(/\/+$/, '') : '';

    if (prefix) {
      return `${prefix}/${fileName}`;
    }

    return fileName;
  }

  /**
   * 构建上传请求头
   */
  private buildHeaders(options?: UploadOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'x-oss-storage-class': this.config.storageClass,
      'x-oss-object-acl': this.config.acl || 'private',
    };

    if (options) {
      // 禁止覆盖
      if (options.overwrite === false) {
        headers['x-oss-forbid-overwrite'] = 'true';
      }

      // Content-Disposition
      if (options.contentDisposition) {
        headers['Content-Disposition'] = options.contentDisposition;
      }

      // 标签
      if (options.tagging && Object.keys(options.tagging).length > 0) {
        const tagStr = Object.entries(options.tagging)
          .map(([k, v]) => `${k}=${v}`)
          .join('&');
        headers['x-oss-tagging'] = tagStr;
      }

      // 自定义 headers
      if (options.headers) {
        Object.assign(headers, options.headers);
      }
    }

    return headers;
  }

  /**
   * 解析上传结果
   */
  private parseResult(
    result: any,
    objectName: string,
    size: number
  ): UploadResult {
    const url = this.client.signatureUrl(objectName);
    return {
      url,
      objectName,
      size,
      etag: result?.etag || '',
    };
  }

  /**
   * 获取文件访问 URL（带签名）
   * @param objectName 文件对象名称
   * @param expires 过期时间（秒），默认 3600
   * @returns 签名 URL
   */
  getSignatureUrl(objectName: string, expires: number = 3600): string {
    return this.client.signatureUrl(objectName, { expires });
  }

  /**
   * 获取文件访问 URL（公共读 Bucket 可直接访问）
   * @param objectName 文件对象名称
   * @returns 公网 URL
   */
  getPublicUrl(objectName: string): string {
    return `https://${this.config.bucket}.${this.config.endpoint.replace('https://', '')}/${objectName}`;
  }

  /**
   * 检查文件是否存在
   * @param objectName 文件对象名称
   * @returns 是否存在
   */
  async exists(objectName: string): Promise<boolean> {
    try {
      await this.client.head(objectName);
      return true;
    } catch (error: any) {
      if (error.code === 'ObjectNotFoundError' || error.code === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }

  /**
   * 删除文件
   * @param objectName 文件对象名称
   */
  async delete(objectName: string): Promise<void> {
    await this.client.delete(objectName);
  }

  /**
   * 批量删除文件
   * @param objectNames 文件对象名称列表
   */
  async deleteMulti(objectNames: string[]): Promise<void> {
    await this.client.deleteMulti(objectNames);
  }

  /**
   * 获取文件信息
   * @param objectName 文件对象名称
   */
  async getInfo(objectName: string): Promise<FileInfo> {
    const result: any = await this.client.head(objectName);
    return {
      size: Number(result?.size || 0),
      etag: result?.etag || '',
      lastModified: result?.lastModified || '',
      type: result?.type || '',
      storageClass: result?.storageClass || '',
    };
  }

  /**
   * 列出文件
   * @param prefix 前缀（文件夹路径）
   * @param maxKeys 最大返回数量，默认 100
   */
  async listFiles(prefix?: string, maxKeys: number = 100): Promise<FileListItem[]> {
    const result: any = await (this.client as any).list({ prefix, 'max-keys': maxKeys });
    const objects = result?.objects || [];
    return objects.map((obj: any) => ({
      name: obj.name,
      size: Number(obj.size || 0),
      lastModified: obj.lastModified || '',
      etag: obj.etag || '',
    }));
  }
}

export default FileUploadService;
