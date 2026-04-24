# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 交流语言

默认用**中文**与用户沟通。技术标识符（变量名、文件路径、API 名、CLI 命令等）保持英文原样。

## 运行时约束

**这是一个纯 Vercel 项目。不要加回 Express / Koa / 任何传统 Node server。**

- 后端 = `api/**/*.ts`，每个文件是独立 `@vercel/node` 函数
- 共享业务代码 = `lib/*.ts`，**不是** npm workspace；`api/*.ts` 和 `client/src/**/*.ts` 都通过相对路径 import（例如 `../../../lib/appleMusicService`）
- 本地开发 = `npm run dev`（`vercel dev --listen 3000` + Vite 并行，Vite 把 `/api` 代理到 `:3000`）
- Production URL = 单一 Vercel 项目，前端与 `/api/**` 同域。**不要加 CORS 配置**
- `vercel dev` 首次需要 `npx vercel link`；如果未 link 直接跑会和 Vite 启动抢终端

## 质量门禁

**唯一工具链是 Biome + TypeScript strict + husky pre-commit。不要引入 ESLint、Prettier、stylelint、lint-staged 或其他 lint/format 工具。**

- `npm run check` = Biome 全仓（lint + format + import sort）
- `npm run typecheck` = tsc --noEmit on `tsconfig.json`（lib + api）和 client workspace
- `npm run validate` = 上面两个并行
- `.husky/pre-commit` 每次 commit 都跑 `check` 然后 `typecheck`，**全仓**不是 staged diff
- Commit 失败时**不要**建议 `--no-verify`，先 `npm run check:fix` 然后手修剩下的

## Commit / PR

- Commit message 用 **Conventional Commits**：`type(scope): subject`。常用 type：`feat`、`fix`、`refactor`、`chore`、`docs`、`perf`、`test`
- 目前分支策略 = 直接 commit 到 `main`（单人 MVP）。改动较大时可以开 feature 分支，但无强制要求
- 无 CI，pre-commit gate 是唯一自动检查

## 双 README 同步

根目录有两份 README：`README.md`（英文）和 `README.zh-CN.md`（中文）。**任一份变更后，必须把对应内容同步到另一份**。用户可以通过 `/sync-readme` slash command 触发系统化同步。

## 前端样式约定

**不要用 CSS Modules**。`client/src/**/*.module.css` 已全量删除。所有样式走两条路：

1. **全局 token / 基础类**：`client/src/styles/global.css` 定义 OKLCH CSS 变量（`--accent`、`--panel`、`--text`、`--hairline` 等）和基础类（`.panel`、`.kbd`、`.input-native`、`.app-bg`、`.page-enter`）。新增共享样式放这里。
2. **组件内 inline styles**：逻辑 / 布局 / 一次性样式全部用 `style={{ ... }}` 写在组件里，读 CSS 变量即可在主题切换时生效。伪类（`:hover`、`:focus-visible`）用全局类；实在需要动态的用 `onMouseEnter/Leave` + `e.currentTarget.style`。

**组件库在 `client/src/components/primitives.tsx`** —— 写新页面时**优先复用**（Button、Pill、StatusDot、AddButton、Segmented、PageHeader、SectionHeader、StatCard、Artwork、ToastProvider + useToast 等）。图标统一从 `client/src/components/icons.tsx` 以 namespace 方式 import：`import * as Icon from '../components/icons'` 然后 `<Icon.Search size={18} />`。

**主题/外观运行时可切**：`useTweaks()` 管理 theme (dark/light) / surface (glass/flat) / nav (sidebar/topnav) / accentHue，持久化到 `localStorage`，并镜像到 `<html>` 的 `data-theme` / `data-surface` 属性和 `--accent-h` CSS 变量。`<TweaksPanel />` 作为 UI 入口（当前挂在 Settings 页的 Appearance section）。

## Apple Music 约束（已定型，不要改）

- Developer Token 两种模式：
  - MVP：设 `APPLE_MUSIC_DEVELOPER_TOKEN`，`lib/developerTokenService.ts` 原样返回
  - 签名：设 `APPLE_TEAM_ID` + `APPLE_KEY_ID` + `APPLE_PRIVATE_KEY`（**inline PEM**，不是文件路径），ES256 签 JWT
- **在 Vercel 部署时绝不能用 `APPLE_PRIVATE_KEY_PATH`** —— serverless 没有持久文件系统
- Music User Token 只做转发，**永不持久化**到服务端；通过 `x-music-user-token` header 传
- `POST /v1/me/library` 的 querystring 必须手写 `ids%5B<type>%5D=a,b`。不要尝试用 `URLSearchParams` 优化，它会把 `%5B` 再次编码。详见 `lib/appleMusicService.ts` 的 `addToLibrary`
- MusicKit 初始化走 `MusicKit.getInstance?.() ?? await MusicKit.configure(...)`，用于躲开 React StrictMode 开发模式的双调用

## 环境变量加载

`lib/env.ts` 在 `!isVercel` 时才调 `dotenv.config()`，默认从 `process.cwd()` 读 `.env`。所有本地入口（`vite`、`vercel dev`、任何 tsx 脚本）都应该从仓库根运行，否则 `.env` 找不到。

## 测试

- **Vitest 2.x** 覆盖 `lib/**` 和 `api/**`（Node environment）。测试文件和源文件并排：`lib/validators.test.ts` 贴着 `lib/validators.ts`
- 常用命令：`npm test`（单次跑）、`npm run test:watch`（开发时用）、`npm run test:coverage`（生成 v8 coverage）
- `npm run validate` 现在并行跑 `check` + `typecheck` + `test`，pre-commit hook 只跑前两项（测试较慢暂不进 gate；真要进就改 `.husky/pre-commit`）
- **client/ 的 React 组件测试尚未配置** —— 需要 `jsdom` + `@testing-library/react`；新增前端测试前先配 `client/vitest.config.ts`
- 写新功能应尽量同步加 `*.test.ts`。纯函数（`lib/`）优先覆盖；handler（`api/`）通过 mock `fetch` 做 integration test

## 文档结构

- `docs/` 在 `.gitignore` 里，是本地临时产物，不纳入版本控制
- 没有 `specs/` 目录、没有 phase 实施文档 —— 所有设计讨论走对话，产出写进 README 的 Roadmap / Known Limitations
