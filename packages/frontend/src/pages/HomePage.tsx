import { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { upsertTask } from '../db/taskStore';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: { videoUrl: string }) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/tasks', {
        videoUrl: values.videoUrl,
      });

      // 保存任务到 IndexedDB
      await upsertTask({
        taskId: response.data.taskId,
        videoUrl: values.videoUrl,
        status: 'pending',
        progress: 0,
        createdAt: new Date().toISOString(),
      });

      message.success('任务创建成功');
      navigate(`/task/${response.data.taskId}`);
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card title="视频解析" style={{ marginTop: 24 }}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <PlayCircleOutlined style={{ fontSize: 64, color: '#1890ff', marginBottom: 24 }} />
          <h2 style={{ marginBottom: 32 }}>输入视频 URL 开始解析</h2>
          <Form
            form={form}
            onFinish={handleSubmit}
            layout="inline"
            style={{ justifyContent: 'center', gap: 12 }}
          >
            <Form.Item
              name="videoUrl"
              rules={[
                { required: true, message: '请输入视频 URL' },
                { pattern: /^https?:\/\/.+/, message: '请输入有效的 URL' },
              ]}
            >
              <Input placeholder="https://www.bilibili.com/video/..." style={{ width: 500 }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} size="large">
                开始解析
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Card>
    </div>
  );
};

export default HomePage;
