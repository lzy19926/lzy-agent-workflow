import { Response, Request } from 'express';

// SSE 客户端集合
const sseClients = new Map<string, Response>();

/**
 * 推送 SSE 事件
 * @param taskId - 任务 ID
 * @param event - 事件数据
 */
export function sendSSE(taskId: string, event: { type: string; taskId: string; data?: any }): void {
  const client = sseClients.get(taskId);
  if (client) {
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  }
  // 广播给所有客户端
  sseClients.forEach((c, key) => {
    if (key !== taskId) {
      c.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  });
}

/**
 * 获取 SSE 客户端集合
 */
export function getSSEClients(): Map<string, Response> {
  return sseClients;
}

/**
 * 关闭指定任务的 SSE 连接
 */
export function closeSSEConnection(taskId: string): void {
  const client = sseClients.get(taskId);
  if (client) {
    client.end();
    sseClients.delete(taskId);
  }
}

/**
 * 设置 SSE 连接
 */
export function setupSSE(req: Request, res: Response): void {
  const { taskId } = req.query;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // 发送初始连接确认
  res.write(': connected\n\n');

  const clientId = taskId as string || 'all';
  sseClients.set(clientId, res);

  req.on('close', () => {
    sseClients.delete(clientId);
  });
}
