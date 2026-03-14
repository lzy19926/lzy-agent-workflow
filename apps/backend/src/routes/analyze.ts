import { Router, Request, Response } from 'express';
import { AnalysisService, getAnalysisSteps } from '../services/analysis-service';

const router: Router = Router();
const analysisService = new AnalysisService();

// 提交分析请求
router.post('/', async (req, res) => {
  try {
    const { projectPath, selectedStepKeys } = req.body;

    if (!projectPath) {
      return res.status(400).json({ message: 'projectPath 是必需参数' });
    }

    const task = await analysisService.createTask(projectPath, selectedStepKeys);
    const steps = getAnalysisSteps();
    res.json({ taskId: task.id, steps });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 获取任务列表
router.get('/', async (_req, res) => {
  try {
    const tasks = await analysisService.getTaskList();
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 查询任务状态
router.get('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await analysisService.getTask(taskId);

    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }

    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 删除任务
router.delete('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const deleted = await analysisService.deleteTask(taskId);

    if (!deleted) {
      return res.status(404).json({ message: '任务不存在' });
    }

    res.json({ message: '删除成功' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 获取分析报告
router.get('/:taskId/report', async (req, res) => {
  try {
    const { taskId } = req.params;
    const report = await analysisService.getReport(taskId);

    if (!report) {
      return res.status(404).json({ message: '报告不存在' });
    }

    res.setHeader('Content-Type', 'text/markdown');
    res.send(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 获取单个报告文件
router.get('/:taskId/report/:reportName', async (req, res) => {
  try {
    const { taskId, reportName } = req.params;
    const report = await analysisService.getReport(taskId, reportName);

    if (!report) {
      return res.status(404).json({ message: '报告不存在' });
    }

    res.setHeader('Content-Type', 'text/markdown');
    res.send(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 获取报告列表
router.get('/:taskId/reports', async (req, res) => {
  try {
    const { taskId } = req.params;
    const reports = await analysisService.getReportList(taskId);
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 验证项目目录
router.post('/validate', async (req, res) => {
  try {
    const { projectPath } = req.body;

    if (!projectPath) {
      return res.status(400).json({ message: 'projectPath 是必需参数' });
    }

    const result = await analysisService.validateProject(projectPath);
    // 返回分析步骤列表供前端展示
    res.json({ ...result, steps: getAnalysisSteps() });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 获取分析步骤配置
router.get('/steps', async (_req, res) => {
  try {
    const steps = getAnalysisSteps();
    res.json(steps);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
