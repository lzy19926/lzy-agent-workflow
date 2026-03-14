import { useEffect } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useApiKey, useOutputDir } from '../hooks';

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const [apiKey, setApiKey] = useApiKey();
  const [outputDir, setOutputDir] = useOutputDir();

  useEffect(() => {
    if (apiKey !== undefined) {
      form.setFieldValue('apiKey', apiKey);
    }
    if (outputDir !== undefined) {
      form.setFieldValue('outputDir', outputDir);
    }
  }, [apiKey, outputDir]);

  const handleSubmit = async (values: any) => {
    try {
      await setApiKey(values.apiKey);
      await setOutputDir(values.outputDir);
      message.success('配置已保存');
    } catch (error) {
      message.error('保存失败');
    }
  };

  return (
    <div>
      <Card
        title="设置"
        className="mt-6 max-w-2xl"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {/* API Key 输入 */}
          <Form.Item
            label="阿里云 API Key"
            name="apiKey"
            rules={[{ required: true, message: '请输入 API Key' }]}
            className="mb-4"
          >
            <Input.Password placeholder="sk-xxxxxxxxxxxxxxxx" />
          </Form.Item>

          {/* 输出目录输入 */}
          <Form.Item
            label="输出目录"
            name="outputDir"
            className="mb-4"
          >
            <Input placeholder="./output" />
          </Form.Item>

          {/* 保存按钮 */}
          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
            >
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage;
