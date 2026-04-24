# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 交流语言

默认用**中文**与用户沟通。技术标识符（变量名、文件路径、API 名、CLI 命令等）保持英文原样。

## 运行时约束

**这是一个纯 Next.js 14 App Router 项目，部署在 Vercel。不要加回 Vite、Express 或 `@vercel/node` 函数。**

- 框架：Next.js 14.x + React 18，App Router（`src/app/**`）
- 后端 = `src/app/api/**/route.ts`（Next.js route handlers，每个文件按 `GET` / `POST` 等命名 export）
- 前端 = `src/app/**/page.tsx`（file-system routing），每个 page 文件以 `'use client'` 起头
- 共享业务代码 = `src/lib/*.ts`（Apple Music service、validators、token service、env、httpError、nextHandler wrapper 等）
- 路径别名 = `@/*` → `./src/*`；所有 import 用 `@/lib/...` / `@/components/...` / `@/hooks/...` 而非相对路径
- 本地开发 = `npm run dev`（就是 `next dev`），单进程、单端口 3000
- `.env`：Next.js 自动加载；客户端可见的变量必须前缀 `NEXT_PUBLIC_*`

## 质量门禁

**唯一工具链是 Biome + TypeScript strict + Vitest + husky pre-commit。不要引入 ESLint、Prettier、stylelint、lint-staged 或其他 lint/format 工具。**

- `npm run check` = Biome 全仓（lint + format + import sort）
- `npm run typecheck` = tsc --noEmit（根 tsconfig，include `src/**`）
- `npm run test` = Vitest，覆盖 `src/lib/**` 和 `src/app/api/**`
- `npm run validate` = 上面三个并行
- `.husky/pre-commit` 每次 commit 跑 `check` + `typecheck`（test 不进 gate）
- Commit 失败时**不要**建议 `--no-verify`，先 `npm run check:fix` 再手修

## Commit / PR

- Conventional Commits：`type(scope): subject`，常用 type：`feat`、`fix`、`refactor`、`chore`、`docs`、`perf`、`test`
- 分支策略 = 直接 commit 到 `main`（单人 MVP）
- 无 CI，pre-commit gate 是唯一自动检查

## 双 README 同步

根目录有两份 README：`README.md`（英文）和 `README.zh-CN.md`（中文）。**任一份变更后，必须把对应内容同步到另一份**。用户可以通过 `/sync-readme` slash command 触发系统化同步。

## 前端样式约定

**不要用 CSS Modules**。所有样式走两条路：

1. **全局 token / 基础类**：`src/app/globals.css` 定义 OKLCH CSS 变量（`--accent`、`--panel`、`--text`、`--hairline` 等）和基础类（`.panel`、`.kbd`、`.input-native`、`.app-bg`、`.page-enter`）。新增共享样式放这里。
2. **组件内 inline styles**：`style={{ ... }}` 写在组件里，读 CSS 变量即可在主题切换时生效。伪类（`:hover` 等）用全局类；动态 hover 效果用 `onMouseEnter/Leave` + `e.currentTarget.style`。

**组件库在 `src/components/primitives.tsx`** —— 写新页面时**优先复用**（Button、Pill、StatusDot、AddButton、Segmented、PageHeader、SectionHeader、StatCard、Artwork、ToastProvider + useToast 等）。图标统一从 `src/components/icons.tsx` 以 namespace 方式 import：`import * as Icon from '@/components/icons'` 然后 `<Icon.Search size={18} />`。

**Client components**：任何用 React hooks、浏览器 API、或带 `onClick`/`onChange` 事件的组件都必须以 `'use client';` 起头。App Router 默认 Server Component，忘记这个 directive 会在 build 时报 "hook only valid in client components"。

**主题/外观运行时可切**：`useTweaks()` 管理 theme (dark/light) / surface (glass/flat) / nav (sidebar/topnav) / accentHue，持久化到 `localStorage`，并镜像到 `<html>` 的 `data-theme` / `data-surface` 属性和 `--accent-h` CSS 变量。`<TweaksPanel />` 挂在 Settings 页的 Appearance section。

## Apple Music 约束（已定型，不要改）

- 这个 MVP 使用 **WebPlay-scraped Developer Token**（不是标准 $99 Apple Developer Program 自签）。Token 在 `.env` 的 `APPLE_MUSIC_DEVELOPER_TOKEN` 里；`src/lib/developerTokenService.ts` 原样返回
- Scraped token 的 JWT claim 里有 `root_https_origin: ["apple.com"]`，Apple 服务端强制检查请求 Origin —— 所以 `src/lib/appleMusicService.ts` 里所有 fetch 必须带 `Origin: https://music.apple.com` + 桌面浏览器 User-Agent header。这有测试锁住（`src/lib/appleMusicService.test.ts`），**不要擅自删**
- API base = `https://amp-api.music.apple.com/v1`（Apple Web player 的官方 endpoint，和 scraped token 成对）
- Scraped token 约 72 天过期，到期需重爬 `beta.music.apple.com` 拿新 token 贴回 `.env`
- Music User Token 只做转发，**永不持久化**到服务端；通过 `x-music-user-token` header 传
- `POST /v1/me/library` 的 querystring 必须手写 `ids%5B<type>%5D=a,b`。不要用 `URLSearchParams` 优化它会把 `%5B` 再次编码。详见 `addToLibrary`
- MusicKit 初始化走 `MusicKit.getInstance?.() ?? await MusicKit.configure(...)`，用于躲开 React StrictMode 的双调用
- **本地 dev 约束**：如果 shell 有 `http_proxy` / `https_proxy`（比如 Clash 等代理软件），curl `localhost:3000` 会被丢进代理 → 返 503。测试时用 `curl --noproxy '*'` 或在 shell 里 `unset http_proxy https_proxy`

## Route handler 约定

- `src/app/api/**/route.ts` 每个文件 export 按 method 命名的函数（`export const GET = ...`、`export const POST = ...`）
- 用 `@/lib/nextHandler` 的 `withErrorHandler` 包裹每个 handler —— 它处理 HttpError / generic Error，返回统一错误 envelope `{ error: { message, status, details? } }`
- 读查询 / header 用 `pickQuery(req, name)` / `pickHeader(req, name)` / `pickInt(raw)` helpers
- **不要** 重新实现 `requireMethod` —— Next.js App Router 按 export 函数名自动分发 method，错误 method 自动返 405

## 测试

- **Vitest 2.x** 覆盖 `src/lib/**` 和 `src/app/api/**`（Node environment）。测试文件和源文件并排：`src/lib/validators.test.ts` 贴着 `src/lib/validators.ts`
- 常用命令：`npm test` / `npm run test:watch` / `npm run test:coverage`
- **前端 React 组件测试尚未配置** —— 需要 `jsdom` + `@testing-library/react`
- 写新功能应尽量同步加 `*.test.ts`。纯函数（validators、service）优先；handler 通过 mock `fetch` 做 integration test

## 文档结构

- `docs/` 在 `.gitignore` 里，是本地临时产物，不纳入版本控制
- 没有 `specs/` 目录、没有 phase 实施文档 —— 所有设计讨论走对话，产出写进 README 的 Roadmap / Known Limitations
- `ui-design/` 是原型参考（gitignored），实际 UI 在 `src/` 下
