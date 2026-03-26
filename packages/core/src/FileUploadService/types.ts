/**
 * 文件上传结果
 */
export interface UploadResult {
  /**
   * 上传后的文件 URL（公网可访问）
   */
  url: string;
  /**
   * 文件在存储中的对象名称（文件路径）
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
}

/**
 * 存储配置
 */
export interface StorageConfig {
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
  /**
   * 自定义对象名称（文件在存储中的路径），如果不传则根据文件名自动生成
   */
  objectName?: string;
  /**
   * 前缀路径，用于组织文件目录结构
   */
  prefix?: string;
}

/**
 * 文件信息
 */
export interface FileInfo {
  size: number;
  etag: string;
  lastModified: string;
  type: string;
  storageClass: string;
}

/**
 * 文件列表项
 */
export interface FileListItem {
  name: string;
  size: number;
  lastModified: string;
  etag: string;
}
