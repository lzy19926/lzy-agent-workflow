import React, { useState } from 'react';
import { Drawer, Button, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import '@/styles/markdown.css';

interface MarkdownViewerProps {
  title?: string;
  content: string | null;
  open: boolean;
  onClose: () => void;
  width?: number;
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  title,
  content,
  open,
  onClose,
  width = 1000,
}) => {
  const [copied, setCopied] = useState(false);

  // 复制 MD 内容
  const handleCopyMarkdown = async () => {
    if (content) {
      try {
        await navigator.clipboard.writeText(content);
        message.success('已复制到剪贴板');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        message.error('复制失败');
      }
    }
  };

  // Markdown 自定义渲染组件
  const markdownComponents = {
    table: ({ node, ...props }: any) => (
      <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
        <table {...props} />
      </div>
    ),
  };

  return (
    <Drawer
      title={title || 'Markdown 查看'}
      placement="right"
      width={width}
      onClose={onClose}
      open={open}
      extra={
        <Button icon={<CopyOutlined />} onClick={handleCopyMarkdown}>
          {copied ? '已复制' : '复制 MD'}
        </Button>
      }
    >
      {content && (
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
            {content}
          </ReactMarkdown>
        </div>
      )}
    </Drawer>
  );
};

export default MarkdownViewer;
