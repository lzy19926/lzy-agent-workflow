import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProjectSelector from '@/components/ProjectSelector';
import AnalysisStatus from '@/components/AnalysisStatus';
import { analyzeApi, ProjectInfo, AnalysisStepConfig } from '@/api/analyze';
import { saveTask, getTaskByTaskId } from '@/db/analysisStore';

const AnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [taskIdFromUrl, setTaskIdFromUrl] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStepConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 从 URL 参数加载 taskId
  useEffect(() => {
    const urlTaskId = searchParams.get('taskId');
    if (urlTaskId) {
      setTaskIdFromUrl(urlTaskId);
      setTaskId(urlTaskId);
      // 从 IndexDB 获取任务步骤
      const fetchStepsFromDb = async () => {
        try {
          const dbTask = await getTaskByTaskId(urlTaskId);
          if (dbTask?.steps) {
            setAnalysisSteps(dbTask.steps);
          } else {
            // 如果 IndexDB 中没有，从服务端获取默认步骤配置
            const stepsResult = await analyzeApi.getAnalysisSteps();
            setAnalysisSteps(stepsResult);
          }
        } catch (error) {
          console.error('Failed to fetch steps from IndexDB:', error);
          const stepsResult = await analyzeApi.getAnalysisSteps();
          setAnalysisSteps(stepsResult);
        }
      };
      fetchStepsFromDb();
    }
  }, [searchParams]);

  // 处理项目选择
  const handleProjectSelected = useCallback((_projectPath: string, _info: ProjectInfo) => {
    // 项目已被选择，可以在这里存储如果需要的话
  }, []);

  // 开始分析
  const handleAnalyze = useCallback(async (projectPath: string, selectedStepKeys?: string[]) => {
    setIsLoading(true);
    try {
      const result = await analyzeApi.submitAnalyze(projectPath, selectedStepKeys);
      setTaskId(result.taskId);
      // 根据选择的步骤过滤步骤列表
      const stepsToShow = selectedStepKeys && selectedStepKeys.length > 0
        ? result.steps.filter(s => selectedStepKeys.includes(s.key))
        : result.steps;
      setAnalysisSteps(stepsToShow);
      // 清除 URL 参数
      window.history.replaceState({}, '', '/analysis');
      // 保存任务到 IndexDB - 使用简单方式获取项目名称
      const projectName = projectPath.split(/[\\/]/).pop() || projectPath;
      await saveTask({
        taskId: result.taskId,
        projectName,
        projectPath,
        status: 'pending',
        progress: 0,
        steps: stepsToShow,
        selectedStepKeys,
      });
    } catch (err: any) {
      console.error('Failed to submit analyze:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 分析完成
  const handleComplete = useCallback(() => {
    setTaskId(null);
    setTaskIdFromUrl(null);
    setAnalysisSteps([]);
    // 清除 URL 参数
    window.history.replaceState({}, '', '/analysis');
  }, []);

  return (
    <div className="w-full">
      {/* 页面标题区域 - 使用 Tailwind 的间距和排版类 */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2 text-gray-800">
          代码项目分析
        </h1>
        <p className="text-gray-500">
          选择一个代码工程项目目录，通过 Claude Code 进行系统性分析，生成结构化报告。
        </p>
      </div>

      {/* 根据任务状态显示不同组件 */}
      {!taskId && (
        <ProjectSelector
          onProjectSelected={handleProjectSelected}
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
        />
      )}

      {taskId && (
        <AnalysisStatus
          taskId={taskId}
          steps={analysisSteps}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
};

export default AnalysisPage;
