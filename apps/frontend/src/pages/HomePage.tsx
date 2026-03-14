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
    <div className="max-w-4xl mx-auto">
      <Card
        title="视频解析"
        className="mt-6"
      >
        {/* 内容区域 - 使用 Tailwind 的文本和间距类 */}
        <div className="text-center py-10">
          {/* 图标 - 使用 Tailwind 的尺寸和颜色类 */}
          <PlayCircleOutlined
            className="text-6xl text-blue-500 mb-6 block"
          />

          {/* 标题 - 使用 Tailwind 的排版类 */}
          <h2 className="text-2xl font-medium mb-8 text-center">
            输入视频 URL 开始解析
          </h2>

          {/* 表单 - 使用 Tailwind 的 flex 布局类 */}
          <Form
            form={form}
            onFinish={handleSubmit}
            layout="inline"
            className="flex justify-center gap-3"
          >
            <Form.Item
              name="videoUrl"
              rules={[
                { required: true, message: '请输入视频 URL' },
                { pattern: /^https?:\/\/.+/, message: '请输入有效的 URL' },
              ]}
            >
              <Input
                placeholder="https://www.bilibili.com/video/..."
                className="w-[500px]"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
              >
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
