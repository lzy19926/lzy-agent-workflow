import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { BilibiliDownloader, QwenAsrParser, AliOSSUploader, QwenChat } from '@videomemo/core';
import { sendSSE, closeSSEConnection } from './events-service';

// 内存存储任务（后续可替换为数据库）
const tasks = new Map<string, Task>();

export interface Task {
  id: string;
  videoUrl: string;
  title?: string;
  coverUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: {
    text: string;
    summarizedText?: string;
    originText?: string;
    markdown?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface VideoParserConfig {
  oss: {
    bucket: string;
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    prefix?: string;
  };
  asr: {
    apiKey: string;
    model?: string;
  };
  qwen: {
    apiKey?: string;
    model?: string;
  };
  outputDir: string;
}

/**
 * 获取配置（从环境变量或配置文件）
 */
function getConfig(): VideoParserConfig {
  const configPath = path.join(process.cwd(), '..', 'core', 'src', 'config', 'audioParser.json');
  const configFromFile = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    : {};

  // 从环境变量读取，优先使用环境变量
  return {
    oss: {
      bucket: process.env.OSS_BUCKET || configFromFile.oss?.bucket || '',
      region: process.env.OSS_REGION || configFromFile.oss?.region || '',
      accessKeyId: process.env.OSS_ACCESS_KEY_ID || configFromFile.oss?.accessKeyId || '',
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || configFromFile.oss?.accessKeySecret || '',
      prefix: configFromFile.oss?.prefix || 'videos/',
    },
    asr: {
      apiKey: process.env.ASR_API_KEY || configFromFile.asr?.apiKey || '',
      model: configFromFile.asr?.model || 'qwen3-asr-flash-filetrans',
    },
    qwen: {
      apiKey: process.env.QWEN_API_KEY || configFromFile.qwen?.apiKey || configFromFile.asr?.apiKey || '',
      model: configFromFile.qwen?.model || 'qwen3-max',
    },
    outputDir: process.env.OUTPUT_DIR || configFromFile.outputDir || path.join(process.cwd(), '..', 'output'),
  };
}

/**
 * 执行视频解析任务
 */
async function executeTask(task: Task) {
  const config = getConfig();

  // 为当前 task 创建独立文件夹
  const taskDir = path.join(config.outputDir, task.id);

  try {
    task.status = 'processing';
    task.progress = 10;
    sendSSE(task.id, { type: 'progress', taskId: task.id, data: { progress: 10, status: 'processing', message: '开始下载...' } });

    // 确保输出目录和任务目录存在
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }
    if (!fs.existsSync(taskDir)) {
      fs.mkdirSync(taskDir, { recursive: true });
    }

    // 步骤 1: 下载音频
    console.log(`[Task ${task.id}] 下载音频：${task.videoUrl}`);
    const downloader = new BilibiliDownloader();
    const audioResult = await downloader.downloadAudio(task.videoUrl, taskDir);
    task.title = audioResult.title;
    task.coverUrl = audioResult.coverUrl;
    task.progress = 40;
    sendSSE(task.id, {
      type: 'progress',
      taskId: task.id,
      data: {
        progress: 40,
        status: 'processing',
        message: '音频下载完成，上传到 OSS...',
        title: audioResult.title,
        coverUrl: audioResult.coverUrl,
      }
    });

    // 步骤 2: 上传到 OSS
    console.log(`[Task ${task.id}] 上传到 OSS: ${audioResult.filePath}`);
    const uploader = new AliOSSUploader({
      bucket: config.oss.bucket,
      region: config.oss.region,
      accessKeyId: config.oss.accessKeyId,
      accessKeySecret: config.oss.accessKeySecret,
    });
    const objectKey = `${config.oss.prefix || 'videos/'}${Date.now()}_${path.basename(audioResult.filePath)}`;
    const uploadResult = await uploader.uploadFile(audioResult.filePath, objectKey);
    const fileUrl = uploader.getSignatureUrl(objectKey, 3600);
    task.progress = 60;
    sendSSE(task.id, {
      type: 'progress', taskId: task.id, data: {
        progress: 60,
        status: 'processing',
        message: 'OSS 上传完成，开始识别...',
        title: audioResult.title,
        coverUrl: audioResult.coverUrl,
      }
    });

    // 步骤 3: 语音识别
    console.log(`[Task ${task.id}] 语音识别：${fileUrl}`);
    const asrParser = new QwenAsrParser({
      apiKey: config.asr.apiKey,
      model: config.asr.model,
    });
    const asrResult = await asrParser.transcribe(fileUrl);
    task.progress = 80;
    sendSSE(task.id, {
      type: 'progress', taskId: task.id, data: {
        progress: 80,
        status: 'processing',
        message: '识别完成，整理文本...',
        title: audioResult.title,
        coverUrl: audioResult.coverUrl,
      }
    });

    // 保存原始文本到 task 文件夹
    const originTextFile = path.join(taskDir, 'origin.md');
    fs.writeFileSync(originTextFile, asrResult.text || '', 'utf-8');

    // 步骤 4: AI 整理文本
    console.log(`[Task ${task.id}] AI 整理文本`);
    const qwenChat = new QwenChat({
      apiKey: config.qwen.apiKey || '',
      model: config.qwen.model || 'qwen3-max',
    });

    const promptPath = path.join(process.cwd(), '..', 'core', 'src', 'skills', 'text_summarizer.md');
    const prompt = fs.existsSync(promptPath) ? fs.readFileSync(promptPath, 'utf-8') : '请整理以下文本，提取摘要和关键点：';

    const summarizedResult = await qwenChat.chatWithJson(
      [{ role: 'user', content: asrResult.text || '' }],
      prompt
    );

    const summaryData = summarizedResult.data as { summary?: string; keyPoints?: string[]; organizedText?: string };

    // 保存整理后的文本到 task 文件夹
    const outputFile = path.join(taskDir, 'processed.md');
    const outputContent = `# ${task.title || '视频解析结果'}\n\n## 摘要\n${summaryData.summary || ''}\n\n## 关键点\n${Array.isArray(summaryData.keyPoints) ? summaryData.keyPoints.map((p: string) => `- ${p}`).join('\n') : ''}\n\n## 整理后的文本\n${summaryData.organizedText || asrResult.text}`;
    fs.writeFileSync(outputFile, outputContent, 'utf-8');

    task.progress = 100;
    task.status = 'completed';

    // 构建完整的 markdown 内容
    const markdownContent = `# ${task.title || '视频解析结果'}\n\n## 摘要\n${summaryData.summary || ''}\n\n## 关键点\n${Array.isArray(summaryData.keyPoints) ? summaryData.keyPoints.map((p: string) => `- ${p}`).join('\n') : ''}\n\n## 整理后的文本\n${summaryData.organizedText || ''}`;

    task.result = {
      text: asrResult.text || '',
      originText: asrResult.text || '',
      summarizedText: summaryData.organizedText,
      markdown: markdownContent,
    };
    sendSSE(task.id, {
      type: 'complete',
      taskId: task.id,
      data: {
        result: task.result,
        title: audioResult.title,
        coverUrl: audioResult.coverUrl,
      }
    });

    // 清理临时音频文件
    if (fs.existsSync(audioResult.filePath)) {
      fs.unlinkSync(audioResult.filePath);
    }

    console.log(`[Task ${task.id}] 完成，文件保存在：${taskDir}`);
  } catch (error: any) {
    console.error(`[Task ${task.id}] 错误:`, error);
    task.status = 'failed';
    task.error = error.message || '未知错误';
    sendSSE(task.id, { type: 'error', taskId: task.id, data: { error: task.error } });
  }

  task.updatedAt = new Date().toISOString();
}

/**
 * 创建新任务
 */
export async function createTask(videoUrl: string): Promise<{ taskId: string; status: string }> {
  const task: Task = {
    id: uuidv4(),
    videoUrl,
    status: 'pending',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tasks.set(task.id, task);

  // 异步执行任务
  executeTask(task);

  return { taskId: task.id, status: task.status };
}

/**
 * 获取任务列表
 */
export function getTasks(): Task[] {
  return Array.from(tasks.values()).sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * 获取任务详情
 */
export function getTaskById(id: string): Task | undefined {
  return tasks.get(id);
}

/**
 * 删除任务
 */
export function deleteTask(id: string): boolean {
  return tasks.delete(id);
}

/**
 * 获取健康状态
 */
export function getHealth() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'videomemo-api',
    tasks: {
      total: tasks.size,
      processing: Array.from(tasks.values()).filter(t => t.status === 'processing').length,
    },
  };
}

/**
 * 获取所有任务（供内部使用）
 */
export function getAllTasks(): Map<string, Task> {
  return tasks;
}
