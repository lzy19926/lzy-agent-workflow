import { Router, Request, Response } from 'express';
import * as tasksService from '../services/tasks-service';

const router: Router = Router();

/**
 * POST /api/tasks - 创建新任务
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl || typeof videoUrl !== 'string') {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: '缺少 videoUrl 参数' } });
      return;
    }

    const result = await tasksService.createTask(videoUrl);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/tasks - 获取任务列表
 */
router.get('/', (_req: Request, res: Response) => {
  const taskList = tasksService.getTasks();
  res.json({ tasks: taskList });
});

/**
 * GET /api/tasks/:id - 获取任务详情
 */
router.get('/:id', (req: Request, res: Response) => {
  const task = tasksService.getTaskById(req.params.id);

  if (!task) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '任务不存在' } });
    return;
  }

  res.json({ task });
});

/**
 * DELETE /api/tasks/:id - 删除任务
 */
router.delete('/:id', (req: Request, res: Response) => {
  const deleted = tasksService.deleteTask(req.params.id);

  if (!deleted) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: '任务不存在' } });
    return;
  }

  res.json({ success: true });
});

/**
 * GET /api/tasks/health - 健康检查
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json(tasksService.getHealth());
});

export default router;
