import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, Input, Space, Card, Typography, Alert, Tag, Row, Col, Statistic, Checkbox, Divider } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import { FolderOutlined, FileTextOutlined, CodeOutlined, BuildOutlined } from '@ant-design/icons';
import { analyzeApi, ProjectInfo, AnalysisStepConfig } from '@/api/analyze';

const { Text } = Typography;

interface ProjectSelectorProps {
  onProjectSelected: (projectPath: string, info: ProjectInfo) => void;
  onAnalyze: (projectPath: string, selectedStepKeys?: string[]) => void;
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
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStepConfig[]>([]);
  const [selectedStepKeys, setSelectedStepKeys] = useState<string[]>([]);
  const [showStepSelector, setShowStepSelector] = useState(false);
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
    setShowStepSelector(false);
    setSelectedStepKeys([]);

    try {
      const result = await analyzeApi.validateProject(projectPath);
      if (result.valid && result.info) {
        setProjectInfo(result.info);
        onProjectSelected(projectPath, result.info);
        // 验证成功后显示分析步骤选择器，使用返回的 steps
        if (result.steps && result.steps.length > 0) {
          setAnalysisSteps(result.steps);
          setShowStepSelector(true);
          setSelectedStepKeys(result.steps.map(s => s.key));
        }
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
      onAnalyze(projectPath, selectedStepKeys.length > 0 ? selectedStepKeys : undefined);
    }
  }, [projectInfo, projectPath, onAnalyze, selectedStepKeys]);

  // 全选/取消全选
  const handleSelectAll = useCallback((e: CheckboxChangeEvent) => {
    if (e.target.checked) {
      setSelectedStepKeys(analysisSteps.map(s => s.key));
    } else {
      setSelectedStepKeys([]);
    }
  }, [analysisSteps]);

  return (
    <Card title="选择代码工程项目" className="mb-6">
      {/* 隐藏的文件输入，用于选择目录 */}
      <input
        type="file"
        // @ts-ignore - webkitdirectory 是 HTML5 非标准但广泛支持的属性
        webkitdirectory=""
        directory=""
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {/* 路径输入区域 - 使用 Tailwind 的 flex 和间距类 */}
      <Space.Compact className="w-full mb-4">
        <Input
          id="project-path-input"
          placeholder="请输入项目目录路径，例如：C:/Users/username/my-project"
          value={projectPath}
          onChange={(e) => setProjectPath(e.target.value)}
          onPressEnter={handleValidate}
          disabled={isLoading}
          className="flex-1"
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

      {/* 错误提示 - 使用 Tailwind 的间距类 */}
      {error && (
        <Alert
          message="验证失败"
          description={error}
          type={error.includes('提示') ? 'warning' : 'error'}
          showIcon
          className="mb-4"
        />
      )}

      {/* 项目信息预览卡片 */}
      {projectInfo && (
        <Card
          size="small"
          title="项目信息预览"
          className="bg-green-50 border-green-200"
        >
          {/* 项目统计信息 */}
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

          {/* 技术栈标签 */}
          <div className="mt-3">
            <Text className="text-gray-500 mr-2">技术栈：</Text>
            <Space wrap className="mt-2">
              {projectInfo.techStack.map((tech: string) => (
                <Tag key={tech} color="blue">{tech}</Tag>
              ))}
            </Space>
          </div>

          <Divider className="my-4" />

          {/* 分析步骤选择器 */}
          {showStepSelector && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <Text strong>选择分析步骤</Text>
                <Checkbox checked={selectedStepKeys.length === analysisSteps.length} onChange={handleSelectAll}>
                  全选
                </Checkbox>
              </div>

              <div className="flex flex-col gap-3">
                {analysisSteps.map((step) => (
                  <Card
                    key={step.key}
                    size="small"
                    hoverable
                    onClick={() => {
                      if (selectedStepKeys.includes(step.key)) {
                        setSelectedStepKeys(selectedStepKeys.filter(k => k !== step.key));
                      } else {
                        setSelectedStepKeys([...selectedStepKeys, step.key]);
                      }
                    }}
                    className={`
                      cursor-pointer border transition-colors
                      ${selectedStepKeys.includes(step.key)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedStepKeys.includes(step.key)}
                        onChange={() => {}}
                        className="pointer-events-none mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Tag color="blue" className="text-xs font-bold">Step{step.id}</Tag>
                          <Text strong className="text-base">{step.name}</Text>
                        </div>
                        <div className="text-sm text-gray-500">
                          {step.description}
                        </div>
                      </div>
                      {step.skill && (
                        <Tag color="green" className="text-xs h-fit">
                          {step.skill}
                        </Tag>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {selectedStepKeys.length === 0 && (
                <Alert
                  message="请至少选择一个分析步骤"
                  type="warning"
                  showIcon
                  className="mt-3"
                />
              )}
            </div>
          )}

          {/* 开始分析按钮 */}
          <div className="mt-4">
            <Button
              type="primary"
              size="large"
              onClick={handleAnalyze}
              loading={isLoading}
              disabled={selectedStepKeys.length === 0}
              block
            >
              开始分析 ({selectedStepKeys.length} 个步骤)
            </Button>
          </div>
        </Card>
      )}
    </Card>
  );
};

export default ProjectSelector;
