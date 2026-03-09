import OSS from 'ali-oss';
import path from 'path';
import fs from 'fs';

/**
 * 阿里云 OSS 上传结果
 */
export interface AliOSSUploadResult {
  /**
   * 上传后的文件 URL（公网可访问）
   */
  url: string;
  /**
   * OSS 对象名称（文件路径）
   */
  objectName: string;
  /**
   * 文件大小（字节）
   */
  size: number;
  /**
   * ETag
   */
  etag: string;
  /**
   * 安全令牌（如果使用 STS）
   */
  res?: {
    headers: Record<string, string>;
    status: number;
  };
}

/**
 * 阿里云 OSS 配置
 */
export interface AliOSSConfig {
  /**
   * Access Key ID
   * 从环境变量 OSS_ACCESS_KEY_ID 获取或手动配置
   */
  accessKeyId?: string;
  /**
   * Access Key Secret
   * 从环境变量 OSS_ACCESS_KEY_SECRET 获取或手动配置
   */
  accessKeySecret?: string;
  /**
   * Bucket 名称
   */
  bucket: string;
  /**
   * Bucket 所在地域
   * 例如：oss-cn-hangzhou, oss-cn-shanghai, oss-cn-beijing
   */
  region: string;
  /**
   * Endpoint（可选，默认根据 region 自动生成）
   * 例如：https://oss-cn-hangzhou.aliyuncs.com
   */
  endpoint?: string;
  /**
   * 是否使用 V4 签名，默认 true
   */
  authorizationV4?: boolean;
  /**
   * 请求超时（毫秒），默认 300000 (5 分钟)
   */
  timeout?: number;
  /**
   * 默认存储类型
   * Standard: 标准存储
   * IA: 低频访问
   * Archive: 归档存储
   * ColdArchive: 冷归档存储
   */
  storageClass?: 'Standard' | 'IA' | 'Archive' | 'ColdArchive';
  /**
   * 默认访问权限
   * private: 私有
   * public-read: 公共读
   * public-read-write: 公共读写
   */
  acl?: 'private' | 'public-read' | 'public-read-write';
}

/**
 * 上传选项
 */
export interface UploadOptions {
  /**
   * 自定义请求头
   */
  headers?: Record<string, string>;
  /**
   * 是否覆盖同名文件，默认 true
   */
  overwrite?: boolean;
  /**
   * 文件标签
   */
  tagging?: Record<string, string>;
  /**
   * 下载时显示的文件名（Content-Disposition）
   */
  contentDisposition?: string;
  /**
   * 超时时间（毫秒）
   */
  timeout?: number;
}

/**
 * 阿里云 OSS 文件上传器
 *
 * 使用 ali-oss SDK 上传文件到阿里云对象存储
 * 文档：https://help.aliyun.com/document_detail/32092.html
 *
 * 使用示例：
 * ```typescript
 * const uploader = new AliOSSUploader({
 *   bucket: 'my-bucket',
 *   region: 'oss-cn-hangzhou',
 * });
 *
 * const result = await uploader.uploadFile('./audio.mp3', 'uploads/audio.mp3');
 * console.log('文件 URL:', result.url);
 * ```
 */
export class AliOSSUploader {
  private client: OSS;
  private config: Required<AliOSSConfig>;

  constructor(config: AliOSSConfig) {
    this.config = {
      accessKeyId: config.accessKeyId || process.env.OSS_ACCESS_KEY_ID || '',
      accessKeySecret: config.accessKeySecret || process.env.OSS_ACCESS_KEY_SECRET || '',
      bucket: config.bucket,
      region: config.region,
      endpoint: config.endpoint || `https://${config.region}.aliyuncs.com`,
      authorizationV4: config.authorizationV4 ?? true,
      timeout: config.timeout || 300000,
      storageClass: config.storageClass || 'Standard',
      acl: config.acl || 'private',
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
   * 上传本地文件到 OSS
   * @param filePath 本地文件路径
   * @param objectName OSS 中的对象名称（文件路径）
   * @param options 上传选项
   * @returns 上传结果
   */
  async uploadFile(
    filePath: string,
    objectName: string,
    options?: UploadOptions
  ): Promise<AliOSSUploadResult> {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`文件不存在：${absolutePath}`);
    }

    const stats = fs.statSync(absolutePath);
    if (!stats.isFile()) {
      throw new Error(`不是文件：${absolutePath}`);
    }

    return this.uploadLocalFile(absolutePath, objectName, options);
  }

  /**
   * 上传 Buffer 数据到 OSS
   * @param buffer 文件 Buffer
   * @param objectName OSS 中的对象名称（文件路径）
   * @param options 上传选项
   * @returns 上传结果
   */
  async uploadBuffer(
    buffer: Buffer,
    objectName: string,
    options?: UploadOptions
  ): Promise<AliOSSUploadResult> {
    const headers = this.buildHeaders(options);

    const result = await this.client.put(objectName, buffer, {
      headers,
    });

    return this.parseResult(result, objectName, buffer.length);
  }

  /**
   * 上传文件流到 OSS
   * @param filePath 本地文件路径
   * @param objectName OSS 中的对象名称（文件路径）
   * @param options 上传选项
   * @returns 上传结果
   */
  private async uploadLocalFile(
    filePath: string,
    objectName: string,
    options?: UploadOptions
  ): Promise<AliOSSUploadResult> {
    const headers = this.buildHeaders(options);
    const fileStream = fs.createReadStream(filePath);
    const stats = fs.statSync(filePath);

    const result = await this.client.put(objectName, fileStream, {
      headers,
    });

    return this.parseResult(result, objectName, stats.size);
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
        'x-oss-forbid-overwrite' in headers || (headers['x-oss-forbid-overwrite'] = 'true');
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
  ): AliOSSUploadResult {
    const url = this.client.signatureUrl(objectName);
    return {
      url,
      objectName,
      size,
      etag: (result as any).etag || '',
      res: {
        headers: (result as any).res?.headers || {},
        status: (result as any).res?.status || 200,
      },
    };
  }

  /**
   * 获取文件访问 URL（带签名）
   * @param objectName OSS 对象名称
   * @param expires 过期时间（秒），默认 3600
   * @returns 签名 URL
   */
  getSignatureUrl(objectName: string, expires: number = 3600): string {
    return this.client.signatureUrl(objectName, { expires });
  }

  /**
   * 获取文件访问 URL（公共读 Bucket 可直接访问）
   * @param objectName OSS 对象名称
   * @returns 公网 URL
   */
  getPublicUrl(objectName: string): string {
    return `https://${this.config.bucket}.${this.config.endpoint.replace('https://', '')}/${objectName}`;
  }

  /**
   * 检查文件是否存在
   * @param objectName OSS 对象名称
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
   * @param objectName OSS 对象名称
   */
  async delete(objectName: string): Promise<void> {
    await this.client.delete(objectName);
  }

  /**
   * 批量删除文件
   * @param objectNames OSS 对象名称列表
   */
  async deleteMulti(objectNames: string[]): Promise<void> {
    await this.client.deleteMulti(objectNames);
  }

  /**
   * 获取文件信息
   * @param objectName OSS 对象名称
   */
  async getInfo(objectName: string): Promise<{
    size: number;
    etag: string;
    lastModified: string;
    type: string;
    storageClass: string;
  }> {
    const result: any = await this.client.head(objectName);
    return {
      size: Number((result as any).size || 0),
      etag: (result as any).etag || '',
      lastModified: (result as any).lastModified || '',
      type: (result as any).type || '',
      storageClass: (result as any).storageClass || '',
    };
  }

  /**
   * 列出文件
   * @param prefix 前缀（文件夹路径）
   * @param maxKeys 最大返回数量，默认 100
   */
  async listFiles(prefix?: string, maxKeys: number = 100): Promise<{
    name: string;
    size: number;
    lastModified: string;
    etag: string;
  }[]> {
    // ali-oss list 方法签名：list(query: ListObjectsQuery, options?: Object)
    const result: any = await (this.client as any).list({ prefix, 'max-keys': maxKeys });
    const objects = (result as any).objects || [];
    return objects.map((obj: any) => ({
      name: obj.name,
      size: Number(obj.size || 0),
      lastModified: obj.lastModified || '',
      etag: obj.etag || '',
    }));
  }
}

export default AliOSSUploader;
