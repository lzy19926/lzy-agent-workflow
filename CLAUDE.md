# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码仓库中工作提供指导。

## 项目概述

**lzy-Agent-Workflow** 是一个包含 VideoMemo AI 系统的 monorepo，主要功能包括：
- 视频下载和 ASR（自动语音识别）服务
- 基于 LangChain/LangGraph 的 RAG 聊天机器人
- React + Vite + Ant Design 前端
- Express 后端 API
- 基于 Playwright 的 E2E 测试

## Monorepo 目录结构

```
apps/
  frontend/     # React + Vite + Ant Design UI
  backend/      # Express API 服务器
  e2e/          # Playwright E2E 测试
packages/
  core/         # 核心服务（视频、ASR、文件上传、代码分析）
  agents/       # AI 机器人（RAG 机器人、LangGraph 聊天机器人）
  skills/       # Claude Code skills，用于代码分析和文档处理
```

## 构建与开发命令

**包管理器**: pnpm（必需）

```bash
# 安装依赖
pnpm install

# 开发
pnpm dev:frontend     # 启动 Vite 开发服务器
pnpm dev:backend      # 使用 ts-node 启动后端

# 构建
pnpm build            # 通过 lerna 构建所有包
pnpm build:core       # 仅构建 core 包
pnpm build:agents     # 仅构建 agents 包
pnpm build:backend    # 构建后端（转译 TypeScript）
pnpm build:frontend   # 生产环境构建前端

# E2E 测试（在 packages/e2e 中）
pnpm test             # 运行 Playwright 测试
pnpm test:ui          # 带 UI 运行测试
pnpm test:debug       # 调试模式
```

## 架构

### 后端 (`apps/backend/`)
Express 服务器，负责编排 AI 机器人和核心服务：
- 路由：`/api/chat`, `/api/analyze`, `/api/tasks`, `/api/events`
- 使用 `@videomemo/agents` 实现 RAG 和聊天功能
- 使用 `@videomemo/core` 实现视频解析、ASR 和代码分析

### Agents (`packages/agents/`)
基于 LangChain/LangGraph 的 AI 机器人：
- **RagAgent**: 基于向量存储（pgvector）的问答系统，支持文档爬取
- **ChatAgent**: 支持工具调用的对话机器人
- 中间件用于会话管理和工具执行

### Core (`packages/core/`)
共享服务：
- **VideoDownloadService**: Bilibili 视频下载器（yt-dlp 封装）
- **ASRService**: 语音转文字转录
- **FileUploadService**: 文件处理（集成阿里云 OSS）
- **CodeAnalysisService**: TypeScript 代码分析
- **QwenChatService**: Qwen 大模型集成

### Frontend (`apps/frontend/`)
React 18 + Vite + TypeScript：
- UI 组件库：Ant Design 5.x
- 状态管理：Zustand
- 路由：React Router 6.x
- Markdown 渲染：react-markdown + rehype-highlight
- 本地持久化：Dexie（IndexedDB 封装）

## 核心依赖

| 包 | 用途 |
|---------|---------|
| langchain, @langchain/* | AI 机器人框架 |
| @langchain/langgraph | 机器人工作流编排 |
| pgvector, pg | RAG 向量数据库 |
| playwright, crawlee | 网页爬取 |
| antd | UI 组件库 |
| zustand | 状态管理 |
| dexie | IndexedDB 封装 |

## Skills 系统

`packages/skills/` 目录包含 Claude Code skills：

**lzy_ts_code_analyzer**:
- `architecture-analysis`: 前端架构分析器
- `ts-morph-analyzer`: TypeScript 调用链追踪
- `coding-standards`: TS/JS/React 最佳实践
- `react-patterns`: 现代 React 模式
- `typescript-expert`: TypeScript 类型系统专家
- `frontend-mobile-security-xss-scan`: XSS 漏洞检测
- `audit-context-building`: 深度代码上下文分析

**lzy_doc_editor**:
- `docx`: Word 文档创建/编辑
- `xlsx`: Excel 电子表格处理
- `pptx`: PowerPoint 演示文稿处理
- `pdf`: PDF 处理和表单填写

## TypeScript 配置

- **后端/Core**: CommonJS 模块，ES2022 目标
- **前端**: ESNext 模块，ES2020 目标，Vite 打包
- **Agents**: ESNext 模块，bundler 解析
- 所有包均启用严格模式

## 数据库

RAG 机器人使用 PostgreSQL + pgvector 存储嵌入向量。连接配置通过环境变量设置。

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **lzy-Agent-Workflow** (3100 symbols, 7786 relationships, 246 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/lzy-Agent-Workflow/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/lzy-Agent-Workflow/context` | Codebase overview, check index freshness |
| `gitnexus://repo/lzy-Agent-Workflow/clusters` | All functional areas |
| `gitnexus://repo/lzy-Agent-Workflow/processes` | All execution flows |
| `gitnexus://repo/lzy-Agent-Workflow/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
