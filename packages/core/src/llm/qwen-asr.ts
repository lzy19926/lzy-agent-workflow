import https from 'https';

/**
 * 通义千问语音识别结果
 */
export interface QwenAsrResult {
  /**
   * 任务 ID
   */
  taskId: string;
  /**
   * 任务状态
   */
  status: string;
  /**
   * 识别结果文本
   */
  text?: string;
  /**
   * 分段结果
   */
  segments?: QwenAsrSegment[];
}

/**
 * 语音识别分段结果
 */
export interface QwenAsrSegment {
  /**
   * 开始时间（秒）
   */
  beginTime: number;
  /**
   * 结束时间（秒）
   */
  endTime: number;
  /**
   * 文本内容
   */
  text: string;
  /**
   * 置信度
   */
  confidence?: number;
}

/**
 * 通义千问语音识别配置
 */
export interface QwenAsrConfig {
  /**
   * API Key
   */
  apiKey: string;
  /**
   * 模型名称，默认 qwen3-asr-flash-filetrans
   */
  model?: string;
  /**
   * 提交任务 API 端点，默认北京地域
   */
  submitUrl?: string;
  /**
   * 查询任务 API 基础 URL，默认北京地域
   */
  queryUrl?: string;
  /**
   * 是否开启逆文本正则化
   */
  enableItn?: boolean;
  /**
   * 是否开启词级时间戳
   */
  enableWords?: boolean;
  /**
   * 语言代码
   */
  language?: string;
  /**
   * 轮询间隔（毫秒），默认 2000ms
   */
  pollInterval?: number;
  /**
   * 超时时间（毫秒），默认 300000ms
   */
  timeout?: number;
}

/**
 * 提交任务响应
 */
interface SubmitResponse {
  output: {
    task_id: string;
  };
  request_id: string;
}

/**
 * 查询任务响应
 */
interface QueryResponse {
  output: {
    task_status: string;
    results?: {
      url?: string;
    };
    task_metrics?: {
      TOTAL: number;
      SUCCEEDED: number;
      FAILED: number;
    };
  };
  request_id: string;
}

/**
 * 识别结果文件内容
 */
interface AsrResultFile {
  file_url?: string;
  audio_info?: {
    format?: string;
    sample_rate?: number;
  };
  transcripts?: Array<{
    channel_id: number;
    text: string;
  }>;
  sentences?: Array<{
    begin_time: number;
    end_time: number;
    text: string;
    confidence?: number;
  }>;
}

/**
 * 通义千问语音识别器
 *
 * API 文档：https://help.aliyun.com/zh/model-studio/qwen3-asr
 *
 * 北京地域:
 * - 提交：https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription
 * - 查询：https://dashscope.aliyuncs.com/api/v1/tasks/
 *
 * 新加坡地域:
 * - 提交：https://dashscope-intl.aliyuncs.com/api/v1/services/audio/asr/transcription
 * - 查询：https://dashscope-intl.aliyuncs.com/api/v1/tasks/
 */
export class QwenAsrParser {
  private config: Required<QwenAsrConfig>;

  constructor(config: QwenAsrConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'qwen3-asr-flash-filetrans',
      submitUrl: config.submitUrl || 'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',
      queryUrl: config.queryUrl || 'https://dashscope.aliyuncs.com/api/v1/tasks/',
      enableItn: config.enableItn ?? false,
      enableWords: config.enableWords ?? true,
      language: config.language || '',
      pollInterval: config.pollInterval || 2000,
      timeout: config.timeout || 300000,
    };
  }

  /**
   * 从文件 URL 进行语音识别
   * @param fileUrl 音频文件 URL
   * @returns 语音识别结果
   */
  async transcribe(fileUrl: string): Promise<QwenAsrResult> {
    // 步骤 1: 提交任务
    console.log('提交 ASR 转写任务...');
    const taskResponse = await this.submitTask(fileUrl);
    const taskId = taskResponse.output.task_id;
    console.log(`任务已提交，task_id: ${taskId}`);

    // 步骤 2: 轮询任务状态
    await this.waitForCompletion(taskId);

    // 步骤 3: 获取结果
    return this.fetchResult(taskId);
  }

  /**
   * 提交任务
   */
  async submitTask(fileUrl: string): Promise<SubmitResponse> {
    const body = {
      model: this.config.model,
      input: {
        file_url: fileUrl,
      },
      parameters: {
        channel_id: [0],
        enable_itn: this.config.enableItn,
        enable_words: this.config.enableWords,
        ...(this.config.language ? { language: this.config.language } : {}),
      },
    };

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    };

    return this.httpPost<SubmitResponse>(this.config.submitUrl, body, headers);
  }

  /**
   * 查询任务状态
   */
  async fetchTask(taskId: string): Promise<QueryResponse> {
    return this.httpGet<QueryResponse>(`${this.config.queryUrl}${taskId}`);
  }

  /**
   * 等待任务完成
   */
  async waitForCompletion(taskId: string): Promise<void> {
    const startTime = Date.now();
    const timeout = this.config.timeout;
    const pollInterval = this.config.pollInterval;

    while (Date.now() - startTime < timeout) {
      const response = await this.fetchTask(taskId);
      const status = response.output.task_status;

      console.log(`当前任务状态：${status}`);

      if (status === 'SUCCEEDED') {
        console.log('任务完成，最终结果如下：');
        return;
      }
      
      if (status === 'FAILED' || status === 'UNKNOWN' || status === 'CANCELLED') {
        console.log(JSON.stringify(response))
        throw new Error(`任务失败：${status}`);
      
      }

      // 等待 2 秒再查询
      await this.sleep(pollInterval);
    }

    throw new Error(`任务超时 (${timeout}ms)`);
  }

  /**
   * 获取任务结果
   */
  async fetchResult(taskId: string): Promise<QwenAsrResult> {
    const queryResponse = await this.fetchTask(taskId);

    // 从 output.result.transcription_url 获取结果 URL
    const output = queryResponse.output as any;
    const resultsUrl = output.result?.transcription_url;

    if (!resultsUrl) {
      throw new Error('未找到结果 URL');
    }

    // 下载结果文件
    const resultContent = await this.httpGet<string>(resultsUrl, {
      responseType: 'text',
    });

    // 解析 JSON 结果
    const resultFile: AsrResultFile = JSON.parse(resultContent);

    // 从 transcripts 数组中提取文本
    const text = resultFile.transcripts?.[0]?.text || '';

    // 转换为标准格式
    const segments: QwenAsrSegment[] = (resultFile.sentences || []).map((s) => ({
      beginTime: s.begin_time / 1000,
      endTime: s.end_time / 1000,
      text: s.text,
      confidence: s.confidence,
    }));

    return {
      taskId,
      status: 'SUCCEEDED',
      text,
      segments,
    };
  }

  /**
   * HTTP POST 请求
   */
  private httpPost<T>(
    url: string,
    body: unknown,
    headers: Record<string, string>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const bodyStr = JSON.stringify(body);

      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
      req.write(bodyStr);
      req.end();
    });
  }

  /**
   * HTTP GET 请求
   */
  private httpGet<T>(
    url: string,
    options?: { responseType?: 'json' | 'text' }
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const isJson = options?.responseType !== 'text';

      const reqOptions: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      };

      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            if (isJson) {
              resolve(JSON.parse(data));
            } else {
              resolve(data as unknown as T);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
      req.end();
    });
  }

  /**
   * 延时等待
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default QwenAsrParser;
