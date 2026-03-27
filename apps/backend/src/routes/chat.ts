import { Router, Request, Response } from 'express'
import { RAGChatService } from '../services/chat-service'

const router: Router = Router()

// 创建服务实例
const chatService = new RAGChatService()

/**
 * POST /api/chat - RAG Agent 对话接口
 * 请求体：{ message: string }
 * 响应：{ answer: string, conversationId?: string, timestamp: string }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { message } = req.body

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: '缺少 message 参数或消息不能为空' } })
      return
    }

    const result = await chatService.chat(message.trim())
    res.json(result)
  } catch (error: any) {
    console.error('[Chat API] Error:', error)
    res.status(500).json({ error: { code: 'AGENT_ERROR', message: error.message || 'Agent 调用失败' } })
  }
})

/**
 * POST /api/chat/stream - RAG Agent 流式对话接口 (SSE)
 */
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { message } = req.body

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: '缺少 message 参数或消息不能为空' } })
      return
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    // 调用服务层处理流式响应
    await chatService.streamChat(message.trim(), res)

    res.end()
  } catch (error: any) {
    console.error('[Chat Stream API] Error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: { code: 'AGENT_ERROR', message: error.message || 'Agent 调用失败' } })
    } else {
      res.end()
    }
  }
})

/**
 * GET /api/chat/health - 健康检查
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json(chatService.getHealth())
})

export default router
