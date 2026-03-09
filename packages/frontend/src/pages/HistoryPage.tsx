import { Table, Button, Card, Tag, Space, Popconfirm, message } from 'antd';
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTasks, useDeleteTask } from '../hooks';
import axios from 'axios';

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const tasks = useTasks();
  const { deleteTask } = useDeleteTask();

  const handleDelete = async (id: string) => {
    try {
      // 删除本地记录
      await deleteTask(id);
      // 同时删除后端任务（如果存在）
      await axios.delete(`/api/tasks/${id}`).catch(() => {});
      message.success('删除成功');
    } catch (error) {
      message.error('删除失败');
    }
  };

  const statusColorMap: Record<string, string> = {
    pending: 'default',
    processing: 'processing',
    completed: 'success',
    failed: 'error',
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string | undefined, record: any) => {
        if (title) {
          return title;
        }
        // 没有标题时显示 URL（截断）
        const urlDisplay = record.videoUrl.length > 50
          ? record.videoUrl.slice(0, 50) + '...'
          : record.videoUrl;
        return <span style={{ color: '#999' }}>{urlDisplay}</span>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColorMap[status]}>{status}</Tag>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => `${progress}%`,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => new Date(createdAt).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: any) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/task/${record.taskId}`)}
          >
            查看
          </Button>
          <Popconfirm
            title="确定删除吗？"
            onConfirm={() => handleDelete(record.id)}
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
      <Card title="历史记录" style={{ marginTop: 24 }}>
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
        />
      </Card>
    </div>
  );
};

export default HistoryPage;
