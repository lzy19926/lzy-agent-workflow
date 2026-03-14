import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Card, Tag, Space, Popconfirm, message, Typography, Empty, Progress } from 'antd';
import { DeleteOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { analyzeApi, AnalysisStepConfig } from '@/api/analyze';
import {
  getAllTasks,
  deleteTaskByTaskId,
  updateTask,
  saveDocument
} from '@/db/analysisStore';

const { Title } = Typography;

interface TaskRecord {
  taskId: string;
  projectName: string;
  projectPath: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  error?: string;
  steps?: AnalysisStepConfig[];
  createdAt: string;
  completedAt?: string;
}

const AnalysisHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [sseConnections, setSseConnections] = useState<Map<string, EventSource>>(new Map());

  // 加载任务列表
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      // 从 IndexDB 获取本地任务
      const dbTasks = await getAllTasks();

      // 使用 IndexDB 中的 taskId
      setTasks(dbTasks as TaskRecord[]);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 为运行中的任务建立 SSE 连接
  useEffect(() => {
    const runningTasks = tasks.filter(t => t.status === 'running' || t.status === 'pending');

    runningTasks.forEach(task => {
      if (!sseConnections.has(task.taskId)) {
        console.log('[History] 建立 SSE 连接:', task.taskId);
        const eventSource = analyzeApi.createSSEListener(task.taskId, {
          onProgress: (updatedTask) => {
            setTasks(prev => prev.map(t =>
              t.taskId === task.taskId
                ? { ...t, ...updatedTask }
                : t
            ));
            // 同步更新到 IndexDB
            updateTask(task.taskId, {
              status: updatedTask.status,
              progress: updatedTask.progress,
            });
          },
          onComplete: () => {
            setTasks(prev => prev.map(t =>
              t.taskId === task.taskId
                ? { ...t, status: 'completed' as const, progress: 100, completedAt: new Date().toISOString() }
                : t
            ));
            // 同步更新到 IndexDB
            updateTask(task.taskId, {
              status: 'completed',
              progress: 100,
              completedAt: new Date().toISOString(),
            });
          },
          onError: (error) => {
            setTasks(prev => prev.map(t =>
              t.taskId === task.taskId
                ? { ...t, status: 'failed' as const, error }
                : t
            ));
            // 同步更新到 IndexDB
            updateTask(task.taskId, {
              status: 'failed',
              error,
            });
          },
          onStepComplete: (stepKey, content) => {
            console.log('[History] 步骤完成:', stepKey);
            // 保存文档到 IndexDB
            const step = task.steps?.find(s => s.key === stepKey);
            if (step) {
              saveDocument({
                taskId: task.taskId,
                stepKey,
                stepName: step.name,
                content,
              });
            }
          },
        });

        setSseConnections(prev => new Map(prev).set(task.taskId, eventSource));
      }
    });

    // 定期检查并关闭已完成任务的连接
    const checkInterval = setInterval(() => {
      setSseConnections(prev => {
        const next = new Map(prev);
        let changed = false;
        prev.forEach((es, taskId) => {
          const task = tasks.find(t => t.taskId === taskId);
          if (task && (task.status === 'completed' || task.status === 'failed')) {
            es.close();
            next.delete(taskId);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      clearInterval(checkInterval);
    };
  }, [tasks]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // 删除任务
  const handleDelete = async (taskId: string) => {
    try {
      // 删除后端任务
      await axios.delete(`/api/analyze/${taskId}`).catch(() => { });
      // 删除 IndexDB 记录
      await deleteTaskByTaskId(taskId);
      message.success('删除成功');
      loadTasks();
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 查看报告
  const handleViewReport = (taskId: string) => {
    navigate(`/analysis?taskId=${taskId}`);
  };

  const statusColorMap: Record<string, string> = {
    pending: 'default',
    running: 'processing',
    completed: 'success',
    failed: 'error',
  };

  const statusTextMap: Record<string, string> = {
    pending: '等待中',
    running: '分析中',
    completed: '已完成',
    failed: '失败',
  };

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'projectName',
      key: 'projectName',
      render: (name: string, record: TaskRecord) => (
        <div>
          <div className="font-medium">{name || '未知项目'}</div>
          <div className="text-xs text-gray-400 mt-1">{record.projectPath}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColorMap[status]}>{statusTextMap[status]}</Tag>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number, record: TaskRecord) => (
        <Progress
          percent={progress}
          size="small"
          status={record.status === 'failed' ? 'exception' : record.status === 'completed' ? 'success' : 'active'}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => new Date(createdAt).toLocaleString('zh-CN'),
      width: 180,
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (completedAt?: string) =>
        completedAt ? new Date(completedAt).toLocaleString('zh-CN') : '-',
      width: 160,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: unknown, record: TaskRecord) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            size="small"
            type="primary"
            onClick={() => handleViewReport(record.taskId)}
          >
            查看
          </Button>
          <Popconfirm
            title="确定删除吗？"
            onConfirm={() => handleDelete(record.taskId)}
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <Title level={4} className="!m-0">代码分析历史记录</Title>
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={loadTasks}
            loading={loading}
          >
            刷新
          </Button>
        }
      >
        {tasks.length === 0 ? (
          <Empty
            description="暂无分析历史记录"
            className="py-15"
          />
        ) : (
          <Table
            columns={columns}
            dataSource={tasks}
            rowKey="taskId"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default AnalysisHistoryPage;
