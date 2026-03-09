import https from 'https';

/**
 * Qwen 客户端配置
 */
export interface QwenClientConfig {
    /** API Key */
    apiKey: string;
    /** 基础 URL，默认为阿里云北京地域 */
    baseUrl?: string;
    /** 默认模型，默认为 qwen-plus */
    model?: string;
}

/**
 * 聊天消息
 */
export interface ChatMessage {
    /** 角色：system, user, assistant */
    role: 'system' | 'user' | 'assistant';
    /** 消息内容 */
    content: string;
}

/**
 * Qwen 响应结果
 */
export interface QwenResponse<T = unknown> {
    /** 模型输出的内容 */
    content: string;
    /** 解析后的结构化数据（如果设置了 JSON 格式） */
    data?: T;
    /** 使用情况 */
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * Qwen API 响应结构
 */
interface QwenApiResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    error?: {
        message: string;
        type: string;
        code: string;
    };
}

/**
 * Qwen API 客户端
 *
 * 支持结构化输出（JSON Schema）
 *
 * 使用示例:
 * ```typescript
 * const client = new QwenClient({ apiKey: 'sk-xxx' });
 *
 * // 普通对话
 * const result1 = await client.chat([{ role: 'user', content: '你好' }]);
 *
 * // 结构化输出 - 抽取姓名和年龄
 * const result2 = await client.chatWithJson([{
 *   role: 'user',
 *   content: '我叫张三，今年 25 岁'
 * }], '请抽取用户的姓名与年龄信息，以 JSON 格式返回');
 *
 * interface Person { name: string; age: number; }
 * const person = result2.data as Person;
 * ```
 */
export class QwenChat {
    private apiKey: string;
    private baseUrl: string;
    private model: string;

    constructor(config: QwenClientConfig) {
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
        this.model = config.model || 'qwen3-max';
    }

    /**
     * 普通对话
     * @param messages 消息列表
     * @param systemPrompt 系统提示词（可选）
     */
    async chat(
        messages: ChatMessage[],
        systemPrompt?: string
    ): Promise<QwenResponse> {
        const allMessages: ChatMessage[] = [];

        if (systemPrompt) {
            allMessages.push({ role: 'system', content: systemPrompt });
        }
        allMessages.push(...messages);

        const response = await this.request({
            messages: allMessages,
        });

        return {
            content: response.choices[0]?.message?.content || '',
            usage: {
                promptTokens: response.usage?.prompt_tokens || 0,
                completionTokens: response.usage?.completion_tokens || 0,
                totalTokens: response.usage?.total_tokens || 0,
            },
        };
    }

    /**
     * 结构化输出对话（JSON 格式）
     * @param messages 消息列表
     * @param systemPrompt 系统提示词，描述需要抽取的 JSON 结构
     * @param responseFormat 响应格式配置
     */
    async chatWithJson(
        messages: ChatMessage[],
        systemPrompt: string,
        responseFormat: { type: 'json_object' } = { type: 'json_object' }
    ): Promise<QwenResponse> {
        const allMessages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...messages
        ];

        const response = await this.request({
            messages: allMessages,
            response_format: responseFormat,
        });

        const content = response.choices[0]?.message?.content || '';
        let data: unknown;

        try {
            data = JSON.parse(content);
        } catch (e) {
            console.warn('JSON 解析失败:', content);
        }

        return {
            content,
            data,
            usage: {
                promptTokens: response.usage?.prompt_tokens || 0,
                completionTokens: response.usage?.completion_tokens || 0,
                totalTokens: response.usage?.total_tokens || 0,
            },
        };
    }

    /**
     * 发送 API 请求
     */
    private request(body: {
        messages: ChatMessage[];
        response_format?: { type: 'json_object' };
    }): Promise<QwenApiResponse> {
        return new Promise((resolve, reject) => {
            const url = new URL(`${this.baseUrl}/chat/completions`);

            const requestBody = JSON.stringify({
                model: this.model,
                messages: body.messages,
                response_format: body.response_format,
            });

            const options: https.RequestOptions = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody),
                },
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data) as QwenApiResponse;

                        if (res.statusCode && res.statusCode >= 400) {
                            reject(new Error(`API 请求失败：${response.error?.message || res.statusCode}`));
                        } else {
                            resolve(response);
                        }
                    } catch (e) {
                        reject(new Error(`响应解析失败：${data}`));
                    }
                });
            });

            req.on('error', (e) => {
                reject(new Error(`请求错误：${e.message}`));
            });

            req.write(requestBody);
            req.end();
        });
    }
}



export default QwenChat;
