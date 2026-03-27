# VideoMemo - AI 智能视频解析与代码分析工作台

> 一站式 AI 集成工作台：视频转录 + 代码分析 + RAG 智能问答

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)

---

## 功能特性

### 视频转录
- 支持 Bilibili 等视频平台音频提取（基于 yt-dlp）
- 通义千问 ASR 语音转文字
- AI 智能文本整理与摘要（Qwen LLM）
- 实时任务进度追踪（SSE 事件流）
- IndexedDB 历史记录持久化

### 代码分析
- TypeScript/JavaScript 项目系统性分析
- 多步骤可配置分析流程（Claude Code 驱动）
- 技术栈识别与框架检测
- 生成结构化 Markdown 报告
- 分析历史追溯与对比

### RAG 智能问答
- 基于 LangChain/LangGraph 的 AI Agent
- PostgreSQL + pgvector 向量语义检索
- 多格式文档支持（文本/PDF/网页）
- 流式对话响应（SSE）
- 上下文感知记忆系统

---

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React 18)                     │
│            Vite + Ant Design 5 + TypeScript                  │
│   ┌──────────┬──────────┬──────────┬────────────────────┐   │
│   │ HomePage │ ChatPage │ Analysis │ History/Settings   │   │
│   └──────────┴──────────┴──────────┴────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/SSE
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Express)                       │
│              TypeScript + Event Emitter                      │
│   ┌──────────────┬──────────────┬──────────────────────┐   │
│   │ TasksService │ ChatService  │ AnalysisService      │   │
│   │ (视频转录)    │ (RAG 问答)    │ (代码分析)           │   │
│   └──────────────┴──────────────┴──────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │ @videomemo  │    │ PostgreSQL  │    │  Aliyun   │
   │   /core     │    │ + pgvector  │    │ OSS + ASR │
   │ (核心服务)   │    │ (向量存储)   │    │ (云服务)  │
   └─────────────┘    └─────────────┘    └─────────────┘
```

### 技术栈总览

| 层级 | 技术 |
|------|------|
| **前端** | React 18 + Vite + TypeScript + Ant Design 5 + TailwindCSS |
| **状态管理** | Zustand + Dexie.js (IndexedDB) |
| **后端** | Express 4 + TypeScript + SSE |
| **AI 框架** | LangChain 1.2 + LangGraph 1.2 |
| **向量存储** | PostgreSQL + pgvector 0.2 |
| **AI 服务** | 通义千问 ASR + Qwen LLM |
| **视频处理** | yt-dlp + FFmpeg |
| **测试** | Playwright 1.58 + Playwright MCP |

---

## 项目结构

本项目采用 **Lerna + pnpm** 的 Monorepo 架构：

```
lzy-Agent-Workflow/
├── apps/
│   ├── frontend/              # React 前端应用
│   │   ├── src/
│   │   │   ├── pages/         # 7 个页面组件
│   │   │   ├── components/    # 通用 UI 组件
│   │   │   ├── db/            # IndexedDB 数据层
│   │   │   ├── hooks/         # React Hooks
│   │   │   └── api/           # API 客户端
│   │   └── package.json
│   │
│   └── backend/               # Express 后端服务
│       ├── src/
│       │   ├── routes/        # API 路由 (tasks/chat/analyze/events)
│       │   └── services/      # 业务逻辑服务
│       └── package.json
│
├── packages/
│   ├── core/                  # 核心工具服务
│   │   ├── VideoDownloadService/   # 视频下载器
│   │   ├── ASRService/             # 语音转文字
│   │   ├── FileUploadService/      # OSS 上传
│   │   ├── CodeAnalysisService/    # 代码分析执行
│   │   └── QwenChatService/        # Qwen API 封装
│   │
│   ├── agents/                # AI Agent 系统
│   │   ├── rag/
│   │   │   ├── RagAgentService.ts   # RAG 代理入口
│   │   │   ├── VectorStoreService.ts # 向量存储
│   │   │   ├── dataLoader.ts        # 文档加载器
│   │   │   └── tools.ts             # RAG 工具函数
│   │   └── chat/
│   │       ├── agent.ts             # 对话代理
│   │       ├── memory.ts            # 对话记忆
│   │       ├── state.ts             # 状态管理
│   │       └── response.ts          # 响应处理
│   │
│   ├── e2e/                 # Playwright 端到端测试
│   │   ├── tests/
│   │   ├── playwright.config.ts
│   │   └── package.json
│   │
│   └── skills/                # 分析技能定义
│       ├── text_summarizer.md
│       └── ts_code_analyzer.md
│
├── openspec/                  # OpenSpec 设计文档
├── output/                    # 输出文件目录
├── package.json               # Root + Lerna 配置
├── pnpm-workspace.yaml        # pnpm Workspace
├── lerna.json                 # Lerna 配置
└── tsconfig.json              # TypeScript 根配置
```

---

## 快速开始

### 前置要求

| 依赖 | 版本要求 |
|------|----------|
| Node.js | >= 18.0.0 |
| pnpm | >= 8.0.0 |
| PostgreSQL | >= 14 (可选，RAG 需要) |
| pgvector | 0.2.1 (可选，RAG 需要) |

> yt-dlp 和 FFmpeg 已内置于 `packages/core/bin/` 目录

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

在 `apps/backend/` 目录下创建 `.env` 文件：

```bash
cd apps/backend
cp .env.example .env
```

编辑 `.env`：

```env
# ==================== 阿里云 OSS ====================
OSS_BUCKET=your_bucket_name
OSS_REGION=oss-cn-chengdu
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret

# ==================== 通义 ASR ====================
ASR_API_KEY=sk-your_asr_api_key
ASR_MODEL=paraformer-realtime-v1

# ==================== Qwen LLM ====================
QWEN_API_KEY=sk-your_qwen_api_key
QWEN_MODEL=qwen-plus

# ==================== RAG 向量库 (可选) ====================
DATABASE_URL=postgresql://user:password@localhost:5432/videomemo

# ==================== 输出目录 ====================
OUTPUT_DIR=/path/to/output
```

### 3. 启动服务

#### 方式一：同时启动前后端

```bash
# 终端 1 - 后端服务 (http://localhost:3000)
pnpm dev:backend

# 终端 2 - 前端应用 (http://localhost:5173)
pnpm dev:frontend
```

#### 方式二：开发模式

```bash
cd apps/frontend && pnpm dev
```

### 4. 访问应用

| 服务 | URL |
|------|-----|
| 前端应用 | http://localhost:5173 |
| 后端 API | http://localhost:3000 |
| 健康检查 | http://localhost:3000/api/tasks/health |

---

## 常见问题

### 端口被占用
- 后端：修改 `apps/backend/.env` 中的 `PORT`
- 前端：修改 `apps/frontend/vite.config.ts` 中的 `server.port`

### API Key 无效
- 确认阿里云账号状态正常
- 检查 API Key 格式（`sk-` 开头）
- 确认 ASR/Qwen 服务已开通

### 视频下载失败
- 检查网络连接
- 确认视频 URL 有效
- 更新 yt-dlp：`yt-dlp -U`

### RAG 向量库连接失败
- 确认 PostgreSQL 服务运行
- 检查 DATABASE_URL 配置
- 确保 pgvector 扩展已安装：
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

---