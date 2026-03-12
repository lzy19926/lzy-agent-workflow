import axios from 'axios';

const API_BASE_URL = '/api';

export interface AnalyzeRequest {
  projectPath: string;
}

export interface AnalyzeResponse {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export interface AnalysisTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  projectPath: string;
  projectName?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export const analyzeApi = {
  // 提交分析请求
  async submitAnalyze(projectPath: string, selectedStepKeys?: string[]): Promise<{ taskId: string; steps: AnalysisStepConfig[] }> {
    const response = await axios.post(`${API_BASE_URL}/analyze`, { projectPath, selectedStepKeys });
    return response.data;
  },

  // 查询任务状态
  async getTaskStatus(taskId: string): Promise<AnalysisTask> {
    const response = await axios.get(`${API_BASE_URL}/analyze/${taskId}`);
    return response.data;
  },

  // 获取任务列表
  async getTaskList(): Promise<AnalysisTask[]> {
    const response = await axios.get(`${API_BASE_URL}/analyze`);
    return response.data;
  },

  // 获取分析报告
  async getReport(taskId: string, reportName?: string): Promise<string> {
    const url = reportName
      ? `${API_BASE_URL}/analyze/${taskId}/report/${encodeURIComponent(reportName)}`
      : `${API_BASE_URL}/analyze/${taskId}/report`;
    const response = await axios.get(url, {
      responseType: 'text',
    });
    return response.data;
  },

  // 获取报告列表
  async getReportList(taskId: string): Promise<string[]> {
    const response = await axios.get(`${API_BASE_URL}/analyze/${taskId}/reports`);
    return response.data;
  },

  // 验证项目目录
  async validateProject(projectPath: string): Promise<{ valid: boolean; info?: ProjectInfo; error?: string; steps?: AnalysisStepConfig[] }> {
    const response = await axios.post(`${API_BASE_URL}/analyze/validate`, { projectPath });
    return response.data;
  },

  // 获取分析步骤配置
  async getAnalysisSteps(): Promise<AnalysisStepConfig[]> {
    const response = await axios.get(`${API_BASE_URL}/analyze/steps`);
    return response.data;
  },

  // 创建 SSE 连接监听任务进度
  createSSEListener(taskId: string, callbacks: {
    onProgress?: (task: AnalysisTask) => void;
    onComplete?: (report: string) => void;
    onError?: (error: string) => void;
    onStepComplete?: (stepKey: string, content: string) => void;
  }): EventSource {
    const eventSource = new EventSource(`${API_BASE_URL}/events?taskId=${taskId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('[SSE] 收到事件:', data);

      switch (data.type) {
        case 'task_update':
          // 任务状态更新
          callbacks.onProgress?.(data.data);
          break;
        case 'analysis_complete':
          // 分析完成，获取报告
          analyzeApi.getReport(taskId).then(callbacks.onComplete);
          break;
        case 'analysis_error':
          // 分析错误
          callbacks.onError?.(data.data.error);
          break;
        case 'step_complete':
          // 步骤完成，接收文档内容
          if (data.data.content && callbacks.onStepComplete) {
            callbacks.onStepComplete(data.data.stepKey, data.data.content);
          }
          console.log('[SSE] 步骤完成:', data.data.stepKey);
          break;
        case 'step_error':
          // 步骤错误
          console.error('[SSE] 步骤错误:', data.data.error);
          break;
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] 连接错误:', err);
      // 不关闭连接，让服务器保持推送
    };

    return eventSource;
  },
};

// 分析步骤配置
export interface AnalysisStepConfig {
  id: number;
  name: string;
  key: string;
  description: string;
  skill?: string;
}

export interface ProjectInfo {
  name: string;
  path: string;
  language: string;
  framework?: string;
  fileCount: number;
  techStack: string[];
}
