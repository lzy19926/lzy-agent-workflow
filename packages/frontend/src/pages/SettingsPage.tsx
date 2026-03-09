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
      <Card title="设置" style={{ marginTop: 24, maxWidth: 600 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="阿里云 API Key"
            name="apiKey"
            rules={[{ required: true, message: '请输入 API Key' }]}
          >
            <Input.Password placeholder="sk-xxxxxxxxxxxxxxxx" />
          </Form.Item>
          <Form.Item label="输出目录" name="outputDir">
            <Input placeholder="./output" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage;
