import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Descriptions, Progress, Spin, Alert, Tabs, Button } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTask } from '../hooks';
import { updateTaskProgress } from '../db/taskStore';

const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const task = useTask(id || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 等待 IndexedDB 加载任务
    if (task) {
      setLoading(false);
    }
  }, [task]);

  useEffect(() => {
    if (!id) return;

    // 建立 SSE 连接，携带 taskId 参数
    const es = new EventSource(`/api/events?taskId=${id}`);
    es.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.taskId === id) {
        if (data.type === 'complete') {
          await updateTaskProgress(id, {
            status: 'completed',
            progress: 100,
            result: data.data.result,
          });
        } else if (data.type === 'error') {
          await updateTaskProgress(id, {
            status: 'failed',
            error: data.data.error,
          });
        } else {
          // progress 事件，同时更新标题和封面
          await updateTaskProgress(id, {
            status: data.data.status,
            progress: data.data.progress,
            title: data.data.title,
            coverUrl: data.data.coverUrl,
          });
        }
      }
    };
    es.onerror = () => {
      console.error('SSE 连接错误');
      es.close();
    };

    return () => {
      es.close();
    };
  }, [id]);

  if (!id) {
    return <Alert message="缺少任务 ID" type="error" showIcon />;
  }

  if (loading) {
    return <Spin tip="加载中..." style={{ display: 'block', margin: '48px auto' }} />;
  }

  if (!task) {
    return <Alert message="任务不存在" type="error" showIcon />;
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <Descriptions title="任务信息" column={2}>
          {task.title && (
            <Descriptions.Item label="标题" span={2}>{task.title}</Descriptions.Item>
          )}
          <Descriptions.Item label="ID">{task.taskId}</Descriptions.Item>
          <Descriptions.Item label="状态">{task.status}</Descriptions.Item>
          <Descriptions.Item label="URL" span={2}>{task.videoUrl}</Descriptions.Item>

        </Descriptions>
        {(task.status === 'processing' || task.status === 'pending') && (
          <Progress percent={task.progress} status="active" style={{ marginTop: 16 }} />
        )}
        {task.status === 'failed' && task.error && (
          <Alert message={task.error} type="error" showIcon style={{ marginTop: 16 }} />
        )}
      </Card>

      {task.status === 'completed' && task.result && (
        <Card title="解析结果">
          <Tabs
            items={[
              {
                key: 'original',
                label: '原始文本',
                children: (
                  <div>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(task.result?.text || '')}
                      style={{ float: 'right' }}
                    >
                      复制
                    </Button>
                    <pre style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>
                      {task.result.text}
                    </pre>
                  </div>
                ),
              },
              {
                key: 'summarized',
                label: '整理后文本',
                children: (
                  <div>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(task.result?.summarizedText || '')}
                      style={{ float: 'right' }}
                    >
                      复制
                    </Button>
                    <div style={{ marginTop: 16 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {task.result.summarizedText || ''}
                      </ReactMarkdown>
                    </div>
                  </div>
                ),
              },
              {
                key: 'markdown',
                label: 'Markdown',
                children: (
                  <div>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(task.result?.markdown || '')}
                      style={{ float: 'right' }}
                    >
                      复制
                    </Button>
                    <div style={{ marginTop: 16 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {task.result.markdown || ''}
                      </ReactMarkdown>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
};

export default TaskDetailPage;
