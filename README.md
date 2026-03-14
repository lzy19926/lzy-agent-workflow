# VideoMemo - AI 智能视频解析与代码分析工作台

> 一站式 AI 集成工作台 - 视频转录 + 代码分析 + AI 自动化测试

## 功能特性

### 视频解析
- 支持 Bilibili 等视频平台音频提取
- 通义千问 ASR 语音转文字
- 智能文本整理与摘要
- 实时任务进度追踪
- 历史记录持久化存储

### 代码分析
- 支持 TypeScript/JavaScript 项目系统性分析
- 多步骤可配置分析流程
- 生成结构化架构报告
- 支持技术栈识别与框架检测
- 分析历史可追溯查看

### AI 自动化测试
- 基于 Playwright MCP 的端到端测试
- AI 辅助生成测试用例
- 跨浏览器兼容性测试
- 实时 UI 调试模式

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18 + Vite + TypeScript + Ant Design 5 |
| **后端** | Express 4 + TypeScript |
| **数据库** | IndexedDB (Dexie.js) + 内存存储 |
| **AI 服务** | 通义千问 ASR + 阿里云 OSS |
| **视频处理** | yt-dlp + FFmpeg |
| **测试框架** | Playwright + Playwright MCP |

---

## 项目结构

本项目使用 **Lerna** 进行 monorepo 管理，配合 **pnpm** 进行包管理。

```
lzy-VideoMemo/
├── apps/
│   ├── frontend/        # @videomemo/frontend - React 前端应用 (Vite + Ant Design)
│   └── backend/         # @videomemo/backend - Express 后端 API 服务
├── packages/
│   ├── core/            # @videomemo/core - 核心解析逻辑 (下载器/解析器/工具)
│   └── e2e/             # @videomemo/e2e - Playwright E2E 测试套件
├── openspec/            # OpenSpec 设计文档
├── output/              # 解析结果输出目录
├── lerna.json           # Lerna 配置文件
├── pnpm-workspace.yaml  # pnpm workspace 配置
└── README.md
```

### 包依赖关系

| 包名 | 说明 | 依赖 |
|------|------|------|
| `@videomemo/frontend` | React 前端应用 | 无 |
| `@videomemo/backend` | Express 后端服务 | `@videomemo/core` |
| `@videomemo/core` | 核心解析逻辑 | 无 |
| `@videomemo/e2e` | Playwright E2E 测试 | 无 |

---

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- yt-dlp 和 FFmpeg（已内置于 `bin/` 目录）

### 安装依赖

```bash
pnpm install
```

### Lerna 常用命令

```bash
# 查看所有包
pnpm lerna:list

# 构建所有包
pnpm build

# 构建单个包
pnpm --filter @videomemo/core build
pnpm --filter @videomemo/backend build
pnpm --filter @videomemo/frontend build

# 清理
pnpm clean

# 版本管理
pnpm lerna:version    # 版本预览
pnpm lerna:publish    # 发布新版本
```

### 配置环境变量

在 `packages/backend/` 目录下创建 `.env` 文件：

```bash
cd packages/backend
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 阿里云 OSS 配置
OSS_BUCKET=your_bucket
OSS_REGION=oss-cn-chengdu
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret

# 通义千问 ASR 配置
ASR_API_KEY=sk-your_api_key
```

### 启动服务

**分别启动:**
```bash
# 终端 1 - 启动后端
pnpm dev:backend

# 终端 2 - 启动前端
pnpm dev:frontend
```

### 访问应用

- 前端应用：http://localhost:5173
- 后端 API：http://localhost:3000
- 健康检查：http://localhost:3000/api/tasks/health

---

## AI 自动化测试 (Playwright MCP)

项目集成了 **Playwright MCP** 进行端到端自动化测试。

### 运行测试

```bash
cd packages/e2e

# 安装浏览器
pnpm install:browser

# 运行所有测试
pnpm test

# UI 模式（推荐用于调试）
pnpm test:ui

# 调试模式
pnpm test:debug

# 有头模式（显示浏览器）
pnpm test:headed

# 只运行 Chromium
pnpm test:chromium

# 查看测试报告
pnpm test:report
```

### 测试覆盖范围

| 测试文件 | 测试内容 |
|---------|---------|
| `navigation.test.ts` | 导航菜单、路由跳转、响应式布局 |
| `homepage.test.ts` | 视频 URL 输入、表单验证、任务创建 |
| `settings.test.ts` | API Key 配置、输出目录设置 |
| `analysis-page.test.ts` | 项目验证、步骤选择、分析流程 |
| `history-pages.test.ts` | 历史记录列表、查看/删除、分页 |
| `task-detail.test.ts` | 任务状态、进度条、结果展示 |
| `user-flow.test.ts` | 完整用户流程、跨浏览器测试 |

### 使用 AI MCP 生成测试

通过 Claude Code 与 Playwright MCP 集成，可以：

1. **自动分析页面结构** - MCP 自动捕获页面快照
2. **生成页面对象模型** - 自动提取可交互元素
3. **创建测试用例** - 基于用户操作流程生成测试
4. **实时调试** - UI 模式可视化调试

---

## 使用指南

### 视频解析

1. 访问 **设置** 页面，配置阿里云 API Key
2. 在 **首页** 输入 B 站视频 URL
3. 点击 **开始解析**
4. 等待解析完成，查看结果（原始文本/整理文本/Markdown）

### 代码分析

1. 访问 **代码分析** 页面
2. 输入代码项目目录路径
3. 点击 **验证** 确认项目有效
4. 选择分析步骤（支持全选/自定义）
5. 点击 **开始分析**
6. 查看实时进度和分析报告

### 历史记录

- **视频历史** - 查看所有视频解析任务
- **分析历史** - 查看代码分析任务
- 支持查看、删除操作
- 数据持久化于 IndexedDB

---

## API 快速参考

### 创建视频任务
```bash
POST /api/tasks
{
  "videoUrl": "https://www.bilibili.com/video/BVxxx"
}
```

### 创建分析任务
```bash
POST /api/analyze
{
  "projectPath": "/path/to/project",
  "selectedStepKeys": ["step1", "step2"]
}
```

### 获取任务状态
```bash
GET /api/tasks/:id
GET /api/analyze/:id
```

### SSE 实时事件
```bash
GET /api/events?taskId=:id
```

---

## 文档链接

- [启动指南](packages/scripts/STARTUP.md)
- [API 文档](packages/scripts/API.md)
- [测试指南](packages/scripts/TEST_GUIDE.md)
- [E2E 测试文档](packages/e2e/README.md)

---

## Lerna 配置说明

`lerna.json` 配置：
- `version: "independent"` - 使用独立版本模式，每个包独立版本号
- `npmClient: "pnpm"` - 使用 pnpm 作为包管理器
- `packages` - 指定 monorepo 包含的包路径（`apps/*` 和 `packages/*`）

---

## 常见问题

### 端口被占用
修改 `packages/backend/.env` 中的 `PORT`，或修改 `vite.config.ts` 中的 `server.port`

### API Key 无效
- 检查阿里云账号是否欠费
- 确认 API Key 格式正确（`sk-` 开头）
- 确认 ASR 服务已开通

### 下载失败
- 检查网络连接
- 确认视频 URL 有效
- 更新 yt-dlp: `yt-dlp -U`

---

## 许可证

ISC
