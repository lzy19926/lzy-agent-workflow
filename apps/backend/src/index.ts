import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import tasksRouter from './routes/tasks';
import eventsRouter from './routes/events';
import analyzeRouter from './routes/analyze';
import chatRouter from './routes/chat';
import path from 'path';

// 加载环境变量
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req: Request, _res: Response, next: () => void) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API 路由
app.use('/api/tasks', tasksRouter);
app.use('/api/events', eventsRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/chat', chatRouter);

// 根路径
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'VideoMemo API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/tasks/health',
      tasks: 'GET /api/tasks',
      createTask: 'POST /api/tasks',
      taskDetail: 'GET /api/tasks/:id',
      deleteTask: 'DELETE /api/tasks/:id',
      events: 'GET /api/events',
      analyze: 'POST /api/analyze',
      analyzeStatus: 'GET /api/analyze/:taskId',
      analyzeReport: 'GET /api/analyze/:taskId/report',
      chat: 'POST /api/chat',
      chatStream: 'POST /api/chat/stream',
    },
  });
});

// 启动服务
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`VideoMemo API Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/tasks/health`);
  console.log(`Output directory: ${path.join(process.cwd(), '..', 'output')}`);
  console.log('='.repeat(50));
});

export default app;
