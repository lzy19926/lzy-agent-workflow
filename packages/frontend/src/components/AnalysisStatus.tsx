import React, { useEffect, useState } from 'react';
import { Card, Progress, Button, Alert, Typography, Space, Timeline, Tag, Drawer, message } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined, CopyOutlined } from '@ant-design/icons';
import { analyzeApi, AnalysisTask, AnalysisStepConfig } from '@/api/analyze';
import { saveDocument, getDocumentsByTaskId, updateTask } from '@/db/analysisStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import '@/styles/markdown.css';

const { Text } = Typography;

interface AnalysisStatusProps {
  taskId: string | null;
  steps: AnalysisStepConfig[];
  onComplete: () => void;
}

const AnalysisStatus: React.FC<AnalysisStatusProps> = ({ taskId, steps, onComplete }) => {
  const [task, setTask] = useState<AnalysisTask | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [stepDocuments, setStepDocuments] = useState<Map<string, string>>(new Map());
  const [viewingDoc, setViewingDoc] = useState<{ stepName: string; content: string } | null>(null);

  useEffect(() => {
    if (!taskId) return;

    // 创建 SSE 连接
    const eventSource = analyzeApi.createSSEListener(taskId, {
      onProgress: (updatedTask) => {
        setTask(updatedTask);
        // 同步更新到 IndexDB
        updateTask(taskId!, {
          status: updatedTask.status,
          progress: updatedTask.progress,
        });
      },
      onComplete: (reportContent) => {
        setReport(reportContent);
        // 更新任务状态为完成
        updateTask(taskId!, { status: 'completed', completedAt: new Date().toISOString() });
      },
      onError: (error) => {
        console.error('[Analysis] 错误:', error);
        // 更新任务状态为失败
        updateTask(taskId!, { status: 'failed', error });
      },
      onStepComplete: async (stepKey, content) => {
        // 保存文档到 IndexDB
        const step = steps.find(s => s.key === stepKey);
        if (step) {
          try {
            await saveDocument({
              taskId: taskId!,
              stepKey,
              stepName: step.name,
              content,
            });
            console.log(`[Analysis] 文档已保存到 IndexDB: ${step.name}`);
          } catch (error) {
            console.error('Failed to save document:', error);
          }
        }
        // 更新完成状态
        setCompletedSteps((prev) => new Set(prev).add(stepKey));
        // 更新本地缓存
        setStepDocuments((prev) => {
          const newMap = new Map(prev);
          newMap.set(stepKey, content);
          return newMap;
        });
      },
    });

    // 初始获取一次任务状态和文档
    const fetchInitialStatus = async () => {
      try {
        const status = await analyzeApi.getTaskStatus(taskId);
        setTask(status);

        // 从 IndexDB 加载已保存的文档
        const docs = await getDocumentsByTaskId(taskId);
        const docsMap = new Map<string, string>();
        const completedSet = new Set<string>();

        docs.forEach((doc) => {
          docsMap.set(doc.stepKey, doc.content);
          completedSet.add(doc.stepKey);
        });

        setStepDocuments(docsMap);
        setCompletedSteps(completedSet);

        if (status.status === 'completed') {
          const reportContent = await analyzeApi.getReport(taskId);
          setReport(reportContent);
        }
      } catch (err) {
        console.error('Failed to fetch initial task status:', err);
      }
    };

    fetchInitialStatus();

    // 清理函数
    return () => {
      eventSource.close();
    };
  }, [taskId, steps]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <LoadingOutlined spin className="text-blue-500" />;
      case 'running':
        return <LoadingOutlined spin className="text-yellow-500" />;
      case 'completed':
        return <CheckCircleOutlined className="text-green-500" />;
      case 'failed':
        return <CloseCircleOutlined className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'blue';
      case 'running':
        return 'orange';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'default';
    }
  };

  const handleReset = () => {
    setTask(null);
    setReport(null);
    setCompletedSteps(new Set());
    setStepDocuments(new Map());
    setViewingDoc(null);
    onComplete();
  };

  // 根据完成的步骤数计算进度
  const calculateProgress = () => {
    if (task?.status === 'completed') return 100;
    if (task?.status === 'failed') return task.progress;

    if (steps.length === 0) return task?.progress || 0;

    // 每完成一个分析步骤增加进度
    const stepProgress = completedSteps.size * (100 / steps.length);
    return Math.min(stepProgress, 95);
  };

  // 查看步骤文档
  const handleViewDoc = async (stepKey: string) => {
    const content = stepDocuments.get(stepKey);
    if (content) {
      const step = steps.find(s => s.key === stepKey);
      setViewingDoc({ stepName: step?.name || stepKey, content });
    }
  };

  const closeDocDrawer = () => {
    setViewingDoc(null);
  };

  // 复制 MD 内容
  const handleCopyMarkdown = async () => {
    if (viewingDoc?.content) {
      try {
        await navigator.clipboard.writeText(viewingDoc.content);
        message.success('已复制到剪贴板');
      } catch (error) {
        message.error('复制失败');
      }
    }
  };

  // Markdown 自定义渲染组件 - 使用 Tailwind 类
  const markdownComponents = {
    table: ({ node, ...props }: any) => (
      <div className="overflow-x-auto mb-4">
        <table className="border-collapse w-full border border-gray-300" {...props} />
      </div>
    ),
    th: ({ node, ...props }: any) => (
      <th className="border border-gray-300 px-3 py-2 bg-gray-50 font-semibold text-left" {...props} />
    ),
    td: ({ node, ...props }: any) => (
      <td className="border border-gray-300 px-3 py-2" {...props} />
    ),
    pre: ({ node, ...props }: any) => (
      <pre className="my-4 mx-0 p-4 rounded overflow-auto bg-gray-50" {...props}>
        {props.children}
      </pre>
    ),
  };

  if (!taskId && !task) {
    return null;
  }

  // 渲染 Timeline 项目
  const renderTimelineItems = () => {
    const items: any[] = [];

    // 动态添加分析步骤
    steps.forEach((step) => {
      const isCompleted = completedSteps.has(step.key) || task?.status === 'completed';
      const hasDoc = stepDocuments.has(step.key);

      items.push({
        key: step.key,
        color: isCompleted ? 'green' : 'blue',
        children: (
          <Space direction="vertical" className="w-full" size="small">
            <div>
              <Text strong>步骤 {step.id}: {step.name}</Text>
              {isCompleted && (
                <Tag color="green" className="ml-2">完成</Tag>
              )}
            </div>
            <Text type="secondary">{step.description}</Text>
            {hasDoc && (
              <Button
                type="link"
                size="small"
                icon={<FileTextOutlined />}
                onClick={() => handleViewDoc(step.key)}
                className="!p-0 !mt-1"
              >
                查看文档
              </Button>
            )}
          </Space>
        ),
        dot: isCompleted ? <CheckCircleOutlined className="text-green-500" /> : undefined,
      });
    });

    return items;
  };

  return (
    <>
      <Card
        title={
          <Space>
            {task?.status === 'completed' && <CheckCircleOutlined className="text-green-500" />}
            {task?.status === 'failed' && <CloseCircleOutlined className="text-red-500" />}
            <span>
              {task?.status === 'completed' && '分析完成'}
              {task?.status === 'failed' && '分析失败'}
              {task?.status === 'running' && '分析中'}
              {task?.status === 'pending' && '等待中'}
            </span>
          </Space>
        }
        extra={
          task?.status === 'completed' && (
            <Button onClick={handleReset}>分析新项目</Button>
          )
        }
      >
        {task && (
          <>
            {/* 状态指示器和标签 */}
            <div className="mb-4">
              <Space>
                {getStatusIcon(task.status)}
                <Tag color={getStatusColor(task.status)}>
                  {task.status === 'pending' && '等待中'}
                  {task.status === 'running' && '分析中'}
                  {task.status === 'completed' && '已完成'}
                  {task.status === 'failed' && '失败'}
                </Tag>
              </Space>
            </div>

            {/* 进度条 */}
            <Progress
              percent={Math.round(calculateProgress())}
              status={
                task.status === 'failed'
                  ? 'exception'
                  : task.status === 'completed'
                  ? 'success'
                  : 'active'
              }
              className="mb-4"
            />

            {/* 步骤时间线 */}
            <Timeline items={renderTimelineItems()} />

            {/* 错误提示 */}
            {task.status === 'failed' && task.error && (
              <Alert
                message="分析失败"
                description={task.error}
                type="error"
                showIcon
                className="mt-4"
              />
            )}

            {/* 成功提示 */}
            {task.status === 'completed' && (
              <Alert
                message="分析完成！"
                description="报告已生成，请查看下方内容或前往 output 目录查看原始文件。"
                type="success"
                showIcon
                className="mt-4"
              />
            )}

            {/* 显示报告内容 - 使用 Tailwind 的排版和背景类 */}
            {report && (
              <div
                className="
                  mt-6 p-4
                  max-h-[600px] overflow-auto
                  bg-gray-50 rounded-lg
                  text-sm leading-relaxed
                "
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={markdownComponents}
                >
                  {report}
                </ReactMarkdown>
              </div>
            )}
          </>
        )}
      </Card>

      {/* 文档查看 Drawer - 使用 Tailwind 的布局和排版类 */}
      <Drawer
        title={viewingDoc ? `${viewingDoc.stepName} - 分析报告` : ''}
        placement="right"
        width={1000}
        onClose={closeDocDrawer}
        open={!!viewingDoc}
        extra={
          <Button icon={<CopyOutlined />} onClick={handleCopyMarkdown}>
            复制 MD
          </Button>
        }
      >
        {viewingDoc && (
          <div
            className="
              markdown-body
              overflow-auto h-full
              text-sm leading-relaxed
            "
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={markdownComponents}
            >
              {viewingDoc.content}
            </ReactMarkdown>
          </div>
        )}
      </Drawer>
    </>
  );
};

export default AnalysisStatus;
