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
        return <LoadingOutlined spin style={{ color: '#1890ff' }} />;
      case 'running':
        return <LoadingOutlined spin style={{ color: '#faad14' }} />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
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

  // Markdown 自定义渲染组件
  const markdownComponents = {
    table: ({ node, ...props }: any) => (
      <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }} {...props} />
      </div>
    ),
    th: ({ node, ...props }: any) => (
      <th style={{ border: '1px solid #d0d0d0', padding: '8px 12px', background: '#f6f8fa', fontWeight: 600, textAlign: 'left' }} {...props} />
    ),
    td: ({ node, ...props }: any) => (
      <td style={{ border: '1px solid #d0d0d0', padding: '8px 12px' }} {...props} />
    ),
    pre: ({ node, ...props }: any) => (
      <pre style={{ margin: '16px 0', borderRadius: '6px', overflow: 'auto', background: '#f6f8fa', padding: '16px' }}>
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
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text strong>步骤 {step.id}: {step.name}</Text>
              {isCompleted && (
                <Tag color="green" style={{ marginLeft: 8 }}>完成</Tag>
              )}
            </div>
            <Text type="secondary">{step.description}</Text>
            {hasDoc && (
              <Button
                type="link"
                size="small"
                icon={<FileTextOutlined />}
                onClick={() => handleViewDoc(step.key)}
                style={{ padding: 0, marginTop: 4 }}
              >
                查看文档
              </Button>
            )}
          </Space>
        ),
        dot: isCompleted ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : undefined,
      });
    });

    return items;
  };

  return (
    <>
      <Card
        title={
          <Space>
            {task?.status === 'completed' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
            {task?.status === 'failed' && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
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
            <div style={{ marginBottom: 16 }}>
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

            <Progress
              percent={Math.round(calculateProgress())}
              status={
                task.status === 'failed'
                  ? 'exception'
                  : task.status === 'completed'
                  ? 'success'
                  : 'active'
              }
              style={{ marginBottom: 16 }}
            />

            <Timeline items={renderTimelineItems()} />

            {task.status === 'failed' && task.error && (
              <Alert
                message="分析失败"
                description={task.error}
                type="error"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}

            {task.status === 'completed' && (
              <Alert
                message="分析完成！"
                description="报告已生成，请查看下方内容或前往 output 目录查看原始文件。"
                type="success"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}

            {/* 显示报告内容 */}
            {report && (
              <div
                style={{
                  marginTop: 24,
                  maxHeight: '600px',
                  overflow: 'auto',
                  padding: '16px',
                  background: '#fafafa',
                  borderRadius: '8px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                }}
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

      {/* 文档查看 Drawer */}
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
            className="markdown-body"
            style={{
              overflow: 'auto',
              height: '100%',
              fontSize: '14px',
              lineHeight: '1.6',
            }}
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
