import React, { useState, useCallback, useRef } from 'react';
import { Button, Input, Space, Card, Typography, Alert, Tag, Row, Col, Statistic } from 'antd';
import { FolderOutlined, FileTextOutlined, CodeOutlined, BuildOutlined } from '@ant-design/icons';
import { analyzeApi, ProjectInfo } from '@/api/analyze';

const { Text } = Typography;

interface ProjectSelectorProps {
  onProjectSelected: (projectPath: string, info: ProjectInfo) => void;
  onAnalyze: (projectPath: string) => void;
  isLoading: boolean;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  onProjectSelected,
  onAnalyze,
  isLoading,
}) => {
  const [projectPath, setProjectPath] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 触发文件夹选择
  const handleSelectDirectory = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 处理文件夹选择变化
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // 尝试获取绝对路径（需要 Electron 或 Node.js 环境）
      const absolutePath = (file as any).path || '';

      if (absolutePath) {
        // 从文件路径提取目录路径
        const dirPath = absolutePath.substring(0, absolutePath.lastIndexOf('/')) ||
                       absolutePath.substring(0, absolutePath.lastIndexOf('\\'));
        setProjectPath(dirPath);
        setError(null);
      } else {
        // 浏览器环境下无法获取绝对路径，提示用户
        const relativePath = file.webkitRelativePath || '';
        const pathParts = relativePath.split('/');
        const rootFolder = pathParts[0] || '';

        if (rootFolder) {
          setProjectPath(rootFolder);
          setError('提示：已选择文件夹，但浏览器限制无法获取完整路径。如验证失败，请手动输入完整路径，例如：C:/Users/username/my-project');
        }
      }
    }
    e.target.value = ''; // 重置 input 以允许重复选择同一目录
  }, []);

  // 验证项目目录
  const handleValidate = useCallback(async () => {
    if (!projectPath.trim()) {
      setError('请输入项目路径');
      return;
    }

    setIsValidating(true);
    setError(null);
    setProjectInfo(null);

    try {
      const result = await analyzeApi.validateProject(projectPath);
      if (result.valid && result.info) {
        setProjectInfo(result.info);
        onProjectSelected(projectPath, result.info);
      } else {
        setError(result.error || '无效的项目目录');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '验证失败，请检查路径是否正确');
    } finally {
      setIsValidating(false);
    }
  }, [projectPath, onProjectSelected]);

  // 开始分析
  const handleAnalyze = useCallback(() => {
    if (projectInfo) {
      onAnalyze(projectPath);
    }
  }, [projectInfo, projectPath, onAnalyze]);

  return (
    <Card title="选择代码工程项目" style={{ marginBottom: 24 }}>
      {/* 隐藏的文件输入，用于选择目录 */}
      <input
        type="file"
        // @ts-ignore - webkitdirectory 是 HTML5 非标准但广泛支持的属性
        webkitdirectory=""
        directory=""
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
        <Input
          id="project-path-input"
          placeholder="请输入项目目录路径，例如：C:/Users/username/my-project"
          value={projectPath}
          onChange={(e) => setProjectPath(e.target.value)}
          onPressEnter={handleValidate}
          disabled={isLoading}
          style={{ flex: 1 }}
        />
        <Button
          icon={<FolderOutlined />}
          onClick={handleSelectDirectory}
          disabled={isLoading}
        >
          浏览
        </Button>
        <Button
          type="primary"
          onClick={handleValidate}
          loading={isValidating}
          disabled={isLoading || !projectPath.trim()}
        >
          验证
        </Button>
      </Space.Compact>

      {error && (
        <Alert
          message="验证失败"
          description={error}
          type={error.includes('提示') ? 'warning' : 'error'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {projectInfo && (
        <Card
          size="small"
          title="项目信息预览"
          style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="项目名称"
                value={projectInfo.name}
                prefix={<FileTextOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="主要语言"
                value={projectInfo.language}
                prefix={<CodeOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="文件数量"
                value={projectInfo.fileCount}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="框架"
                value={projectInfo.framework || '未知'}
                prefix={<BuildOutlined />}
              />
            </Col>
          </Row>
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">技术栈：</Text>
            <Space wrap style={{ marginTop: 8 }}>
              {projectInfo.techStack.map((tech: string) => (
                <Tag key={tech} color="blue">{tech}</Tag>
              ))}
            </Space>
          </div>
          <div style={{ marginTop: 16 }}>
            <Button
              type="primary"
              size="large"
              onClick={handleAnalyze}
              loading={isLoading}
              block
            >
              开始分析
            </Button>
          </div>
        </Card>
      )}
    </Card>
  );
};

export default ProjectSelector;
