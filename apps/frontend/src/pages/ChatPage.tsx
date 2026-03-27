import { useState, useRef, useEffect } from 'react';
import { Input, Button, message } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import '../styles/ChatPage.css';
import 'highlight.js/styles/github.css';
import '@/styles/markdown.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息
  const sendMessage = async () => {
    if (!inputValue.trim()) {
      message.warning('请输入消息内容');
      return;
    }

    if (loading) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    // 添加一个空的助手消息用于流式更新
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: 'assistant', content: '', timestamp: Date.now() },
    ]);

    try {
      // 使用流式请求
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedContent = parsed.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              // 忽略 JSON 解析错误
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      message.error(error.message || '获取回答失败');
      // 移除空消息
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>AI 对话助手</h2>
        <p>基于 RAG 的知识问答助手</p>
      </div>

      {/* 消息列表 */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <RobotOutlined className="empty-icon" />
            <p>开始对话吧！问我任何问题</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-row ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}
            >
              <div className="message-avatar">
                {msg.role === 'user' ? (
                  <UserOutlined />
                ) : (
                  <RobotOutlined />
                )}
              </div>
              <div className="message-bubble">
                {msg.role === 'assistant' && msg.content ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight]}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
                {msg.role === 'assistant' && !msg.content && loading && (
                  <span className="typing-indicator">思考中...</span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="input-container">
        <Input.TextArea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题... (Enter 发送，Shift+Enter 换行)"
          autoSize={{ minRows: 1, maxRows: 4 }}
          className="chat-input"
          disabled={loading}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={sendMessage}
          loading={loading}
          className="send-button"
        >
          发送
        </Button>
      </div>
    </div>
  );
};

export default ChatPage;
