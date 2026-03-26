import https from "https"
import {
  type ASRConfig,
  type ASRResult,
  type ASRSegment,
  type HookConfig,
  type HookEvent,
  type ValidateResult,
  type SubmitResponse,
  type QueryResponse,
  type AsrResultFile,
} from "./types"

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Required<ASRConfig> = {
  apiKey: "",
  model: "qwen3-asr-flash-filetrans",
  submitUrl: "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription",
  queryUrl: "https://dashscope.aliyuncs.com/api/v1/tasks/",
  enableItn: false,
  enableWords: true,
  language: "",
  pollInterval: 2000,
  timeout: 300000,
}

/**
 * 语音识别服务
 *
 * 负责执行语音识别任务，通过 Hook 机制传递执行状态
 * 不负责任务管理，任务管理由调用方负责
 *
 * 使用示例：
 * ```typescript
 * const service = new ASRService({ hooks: { onStepStart, onStepComplete, ... } });
 * await service.transcribe({ taskId, fileUrl });
 * ```
 */
export class ASRService {
  private config: Required<ASRConfig>
  private hooks: HookConfig

  constructor(config?: Partial<ASRConfig>, hooks?: HookConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    }
    this.hooks = hooks || {}
  }

  /**
   * 触发 Hook
   */
  private async triggerHook(event: HookEvent): Promise<void> {
    const hookMap: Record<HookEvent["type"], keyof HookConfig | undefined> = {
      task_start: "onTaskStart",
      task_complete: "onTaskComplete",
      task_error: "onTaskError",
      step_start: "onStepStart",
      step_complete: "onStepComplete",
      step_error: "onStepError",
      submitting: "onSubmitting",
      submitted: "onSubmitted",
      polling: "onPolling",
      completed: "onCompleted",
      fetching_result: "onFetchingResult",
    }

    const hookKey = hookMap[event.type]
    if (hookKey) {
      const hook = this.hooks[hookKey]
      if (hook) {
        try {
          await hook(event)
        } catch (error) {
          console.error(`[ASRService] Hook ${event.type} error:`, error)
        }
      }
    }
  }

  /**
   * 验证文件 URL
   */
  async validateFileUrl(fileUrl: string): Promise<ValidateResult> {
    try {
      if (!fileUrl || typeof fileUrl !== "string") {
        return {
          valid: false,
          error: "文件 URL 不能为空",
        }
      }

      if (!fileUrl.startsWith("http://") && !fileUrl.startsWith("https://")) {
        return {
          valid: false,
          error: "文件 URL 必须是有效的 HTTP/HTTPS 地址",
        }
      }

      return {
        valid: true,
      }
    } catch (error: any) {
      return {
        valid: false,
        error: error.message,
      }
    }
  }

  /**
   * 从文件 URL 进行语音识别
   * @param taskId 任务 ID
   * @param fileUrl 音频文件 URL
   * @returns 语音识别结果
   */
  async transcribe(taskId: string, fileUrl: string): Promise<ASRResult> {
    try {
      // 触发 task_start hook
      await this.triggerHook({ type: "task_start", taskId })

      // 验证文件 URL
      const validateResult = await this.validateFileUrl(fileUrl)
      if (!validateResult.valid) {
        throw new Error(validateResult.error)
      }

      // 步骤 1: 提交任务
      await this.triggerHook({
        type: "submitting",
        taskId,
        stepKey: "submit",
        stepName: "提交 ASR 转写任务",
      })

      const taskResponse = await this.submitTask(fileUrl)
      const taskRequestId = taskResponse.output.task_id

      await this.triggerHook({
        type: "submitted",
        taskId,
        stepKey: "submit",
        stepName: "提交 ASR 转写任务",
        data: { taskId: taskRequestId },
      })

      // 步骤 2: 轮询任务状态
      await this.waitForCompletion(taskId, taskRequestId)

      // 步骤 3: 获取结果
      await this.triggerHook({
        type: "fetching_result",
        taskId,
        stepKey: "fetch_result",
        stepName: "获取识别结果",
      })

      const result = await this.fetchResult(taskId, taskRequestId)

      // 触发 task_complete hook
      await this.triggerHook({
        type: "task_complete",
        taskId,
        data: { result },
      })

      return result
    } catch (error: any) {
      console.error("[ASRService] Transcription error:", error)

      // 触发 task_error hook
      await this.triggerHook({
        type: "task_error",
        taskId,
        data: { error: error.message },
      })

      throw error
    }
  }

  /**
   * 提交任务
   */
  private async submitTask(fileUrl: string): Promise<SubmitResponse> {
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
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    }

    return this.httpPost<SubmitResponse>(this.config.submitUrl, body, headers)
  }

  /**
   * 查询任务状态
   */
  private async fetchTask(taskId: string): Promise<QueryResponse> {
    return this.httpGet<QueryResponse>(`${this.config.queryUrl}${taskId}`)
  }

  /**
   * 等待任务完成
   */
  private async waitForCompletion(taskId: string, taskIdFromSubmit: string): Promise<void> {
    const startTime = Date.now()
    const timeout = this.config.timeout
    const pollInterval = this.config.pollInterval

    while (Date.now() - startTime < timeout) {
      const response = await this.fetchTask(taskIdFromSubmit)
      const status = response.output.task_status

      // 触发 polling hook
      await this.triggerHook({
        type: "polling",
        taskId,
        data: { status },
      })

      if (status === "SUCCEEDED") {
        await this.triggerHook({
          type: "completed",
          taskId,
          data: { status },
        })
        return
      }

      if (
        status === "FAILED" ||
        status === "UNKNOWN" ||
        status === "CANCELLED"
      ) {
        throw new Error(`任务失败：${status}`)
      }

      // 等待 pollInterval 再查询
      await this.sleep(pollInterval)
    }

    throw new Error(`任务超时 (${timeout}ms)`)
  }

  /**
   * 获取任务结果
   */
  private async fetchResult(
    taskId: string,
    taskIdFromSubmit: string
  ): Promise<ASRResult> {
    const queryResponse = await this.fetchTask(taskIdFromSubmit)

    // 从 output.result.transcription_url 获取结果 URL
    const output = queryResponse.output as any
    const resultsUrl = output.result?.transcription_url

    if (!resultsUrl) {
      throw new Error("未找到结果 URL")
    }

    // 下载结果文件
    const resultContent = await this.httpGet<string>(resultsUrl, {
      responseType: "text",
    })

    // 解析 JSON 结果
    const resultFile: AsrResultFile = JSON.parse(resultContent)

    // 从 transcripts 数组中提取文本
    const text = resultFile.transcripts?.[0]?.text || ""

    // 转换为标准格式
    const segments: ASRSegment[] = (resultFile.sentences || []).map((s) => ({
      beginTime: s.begin_time / 1000,
      endTime: s.end_time / 1000,
      text: s.text,
      confidence: s.confidence,
    }))

    return {
      taskId: taskIdFromSubmit,
      status: "SUCCEEDED",
      text,
      segments,
    }
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
      const parsedUrl = new URL(url)
      const bodyStr = JSON.stringify(body)

      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "POST",
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(bodyStr),
        },
      }

      const req = https.request(options, (res) => {
        let data = ""
        res.on("data", (chunk) => {
          data += chunk
        })
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data))
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          }
        })
      })

      req.on("error", reject)
      req.on("timeout", () => {
        req.destroy()
        reject(new Error("请求超时"))
      })
      req.write(bodyStr)
      req.end()
    })
  }

  /**
   * HTTP GET 请求
   */
  private httpGet<T>(
    url: string,
    options?: { responseType?: "json" | "text" }
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url)
      const isJson = options?.responseType !== "text"

      const reqOptions: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      }

      const req = https.request(reqOptions, (res) => {
        let data = ""
        res.on("data", (chunk) => {
          data += chunk
        })
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            if (isJson) {
              resolve(JSON.parse(data))
            } else {
              resolve(data as unknown as T)
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          }
        })
      })

      req.on("error", reject)
      req.on("timeout", () => {
        req.destroy()
        reject(new Error("请求超时"))
      })
      req.end()
    })
  }

  /**
   * 延时等待
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}