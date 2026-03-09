# VideoMemo

视频解析工具 - 从 Bilibili 等视频平台下载音频并转录为文本

## 项目结构

```
lzy-VideoMemo/
├── packages/          # 大库结构
│   ├── frontend/      # React 前端应用
│   ├── backend/       # Express 后端 API 服务
│   ├── core/          # 核心解析逻辑
│   └── scripts/       # 启动脚本和文档
├── openspec/          # OpenSpec 设计文档
├── output/            # 解析结果输出目录
└── ...配置文件
```

## 快速开始

### 1. 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- yt-dlp（已包含在 bin/ 目录）
- FFmpeg（已包含在 bin/ffmpeg/ 目录）

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

在 `packages/backend/` 目录下创建 `.env` 文件：

```bash
cd packages/backend
cp .env.example .env
```

编辑 `.env` 文件，填入你的阿里云 API 密钥：

```env
# 阿里云 OSS 配置
OSS_BUCKET=your_bucket
OSS_REGION=oss-cn-chengdu
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret

# 通义千问 ASR 配置
ASR_API_KEY=sk-your_api_key
```

### 4. 启动服务

#### 方式一：一键启动（推荐）

**Windows:**
```bash
packages\scripts\start.bat
```

**Linux/Mac:**
```bash
bash packages/scripts/start-dev.sh
```

#### 方式二：分别启动

```bash
# 终端 1 - 启动后端
pnpm dev:backend

# 终端 2 - 启动前端
pnpm dev:frontend
```

### 5. 访问应用

- 前端应用：http://localhost:5173
- 后端 API：http://localhost:3000
- API 健康检查：http://localhost:3000/api/tasks/health

## 使用指南

1. **配置 API 密钥**
   - 访问设置页面
   - 输入阿里云 ASR API Key
   - 保存配置

2. **解析视频**
   - 在首页输入 B 站视频 URL
   - 点击"开始解析"
   - 等待解析完成

3. **查看结果**
   - 解析完成后可查看原始文本和整理后文本
   - 支持一键复制
   - 结果自动保存到 `output/` 目录

4. **历史记录**
   - 所有解析记录保存在浏览器 IndexedDB
   - 关闭浏览器后仍然存在
   - 支持删除和批量删除

## API 文档

### 创建任务
```bash
POST /api/tasks
Content-Type: application/json

{
  "videoUrl": "https://www.bilibili.com/video/BVxxx"
}
```

响应:
```json
{
  "taskId": "uuid",
  "status": "pending"
}
```

### 获取任务列表
```bash
GET /api/tasks
```

响应:
```json
{
  "tasks": [
    {
      "id": "uuid",
      "videoUrl": "https://...",
      "title": "视频标题",
      "status": "completed",
      "progress": 100,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 获取任务详情
```bash
GET /api/tasks/:id
```

### 删除任务
```bash
DELETE /api/tasks/:id
```

### SSE 事件推送
```bash
GET /api/events?taskId=:id
```

事件格式:
```json
{
  "type": "progress",
  "taskId": "uuid",
  "data": {
    "status": "processing",
    "progress": 50,
    "message": "正在下载..."
  }
}
```

## 测试

### 运行 API 测试

```bash
# 确保后端服务已启动
pnpm test:api
```

### 测试指南

详细测试文档请参阅 [packages/scripts/TEST_GUIDE.md](packages/scripts/TEST_GUIDE.md)

## 文档

- **[启动文档](packages/scripts/STARTUP.md)** - 详细的项目启动指南
- **[API 文档](packages/scripts/API.md)** - API 接口说明
- **[测试指南](packages/scripts/TEST_GUIDE.md)** - 测试方法和步骤

## 技术栈

- **前端**: React 18 + Vite + Ant Design 5 + TypeScript
- **后端**: Express 4 + TypeScript（单层架构）
- **数据库**: IndexedDB (Dexie.js)
- **核心模块**: 通义千问 ASR + 阿里云 OSS + yt-dlp + FFmpeg

## 后端架构说明

后端采用简化的单层架构，路由直接处理所有业务逻辑：

```
packages/backend/src/
├── index.ts           # Express 入口
└── routes/
    └── tasks.ts       # 任务路由（包含所有业务逻辑）
```

### 特点
- 无分层架构，路由即服务
- 内存存储任务（轻量级，无需数据库）
- SSE 实时推送任务进度
- 支持断线重连

## 前端架构说明

```
packages/frontend/src/
├── db/                # IndexedDB 封装
│   ├── index.ts       # 数据库定义
│   ├── taskStore.ts   # 任务 CRUD
│   └── configStore.ts # 配置 CRUD
├── hooks/             # React Hooks
│   ├── useTasks.ts    # 任务查询 Hook
│   └── useConfigs.ts  # 配置查询 Hook
├── pages/             # 页面组件
│   ├── HomePage.tsx   # 首页
│   ├── HistoryPage.tsx # 历史记录
│   ├── TaskDetailPage.tsx # 任务详情
│   └── SettingsPage.tsx # 设置
└── components/        # 公共组件
    └── Layout.tsx     # 布局组件
```

## 核心模块

`packages/core/` 目录包含可重用的视频解析模块：

```
packages/core/src/
├── downloaders/       # 视频下载器 (BilibiliDownloader)
├── audioParser/       # 音频解析器 (QwenAsrParser, AliOSSUploader)
├── llm/               # 通义千问 LLM (QwenChat, QwenAsr)
├── tools/             # FFmpeg, yt-dlp 工具
└── config/            # 配置文件
```

## 常见问题

### 1. 端口被占用

修改 `packages/backend/.env`:
```env
PORT=3001
```

修改 `packages/frontend/vite.config.ts`:
```ts
server: {
  port: 5174,
}
```

### 2. API Key 无效

- 检查阿里云账号是否欠费
- 确认 API Key 格式正确（sk-开头）
- 检查 ASR 服务是否开通

### 3. 下载失败

- 检查 yt-dlp 是否为最新版本
- 检查网络连接
- 确认视频 URL 有效

## 许可证

ISC
