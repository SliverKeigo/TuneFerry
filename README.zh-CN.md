# Apple Music Library Organizer

[English](./README.md) · **简体中文**

一个连接你 Apple Music 账号的 Web 应用：搜索 Apple Music 曲库、搜索你自己的资料库，一键把歌曲/专辑/播放列表加入资料库。基于 **Next.js 14** 单应用架构，可部署到 Vercel。

## 技术栈

- **框架：** Next.js 14（App Router）+ React 18 + TypeScript，本地开发单进程 `next dev`。
- **样式：** 基于 OKLCH CSS 变量 token 体系 + inline styles + 小型 `primitives.tsx` 组件库。不使用 UI 框架，也不用 CSS Modules。
- **设计系统：** dark/light 主题、glass/flat 表面、sidebar/topnav/mobile 三种导航形态、运行时可调 accent hue —— 全部走 `useTweaks()`。
- **后端：** Next.js Route Handlers，位于 `src/app/api/**/route.ts`。共享 service 在 `src/lib/`，用 `@/` 别名引入。
- **Token 源：** WebPlay-scraped Developer Token（见[配置](#配置)），搭配 `amp-api.music.apple.com` endpoint。
- **质量门禁：** Biome（lint + format + import 排序）、TypeScript strict、Vitest 覆盖 `src/lib/**` + `src/app/api/**`、husky pre-commit hook。

## 项目结构

```
AM-API/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # 根布局（字体 + MusicKit <Script> + Providers）
│   │   ├── page.tsx          # / 首页
│   │   ├── globals.css       # OKLCH token + 基础类
│   │   ├── dashboard/page.tsx
│   │   ├── search/page.tsx
│   │   ├── library/page.tsx
│   │   ├── organizer/page.tsx
│   │   ├── settings/page.tsx
│   │   └── api/
│   │       ├── health/route.ts
│   │       └── apple-music/
│   │           ├── developer-token/route.ts
│   │           ├── catalog/search/route.ts
│   │           └── me/library/
│   │               ├── route.ts           # POST 加入资料库
│   │               ├── search/route.ts
│   │               └── playlists/route.ts
│   ├── components/           # primitives、icons、AppShell、Sidebar、TopNav、MobileNav、MusicKitProvider、TweaksPanel、Providers
│   ├── hooks/                # useLocalStorage、useMusicKit、useTweaks
│   ├── api/appleMusicApi.ts  # 客户端 fetch 封装
│   ├── types/appleMusic.ts   # 前端类型
│   └── lib/                  # 共享：appleMusicService、developerTokenService、validators、nextHandler、httpError、env、types
├── next.config.js
├── tsconfig.json
├── biome.json
└── vitest.config.ts
```

## 快速开始

```bash
# 1. 安装
npm install

# 2. 配置环境 —— 贴入 scraped Developer Token
cp .env.example .env
#   填 APPLE_MUSIC_DEVELOPER_TOKEN（见下文 配置）

# 3. 启动 dev（单进程，端口 3000）
npm run dev
# → http://localhost:3000
```

> **本地开了 HTTP 代理（Clash、Surge、Shadowsocks 等）** 时，`curl localhost:3000/...` 可能 503，因为 curl 默认把请求丢进代理。用 `curl --noproxy '*' http://localhost:3000/...`，或 `unset http_proxy https_proxy`。

## 配置

把 [`.env.example`](./.env.example) 复制成 `.env`，填：

| 变量 | 用途 |
| --- | --- |
| `APPLE_MUSIC_DEVELOPER_TOKEN` | **必填**。Developer Token 字符串（见下文） |
| `NEXT_PUBLIC_DEFAULT_STOREFRONT` | 可选。客户端启动时的默认 storefront（`us`、`jp`、`hk`、…），默认 `us` |
| `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` / `APPLE_PRIVATE_KEY_PATH` | 可选。仅当想让服务端自签 JWT 时用（需要 Apple Developer Program 订阅） |

### 获取 Developer Token

**两条路径：**

**(A) 官方** —— 需要 [Apple Developer Program](https://developer.apple.com/programs/) 订阅（$99/年）。在后台创建一个勾选 MusicKit 的 Media Services Key，下载 `.p8` 文件，然后：
- 生成一个 Token 贴进 `APPLE_MUSIC_DEVELOPER_TOKEN`，或
- 设置 `APPLE_TEAM_ID` + `APPLE_KEY_ID` + `APPLE_PRIVATE_KEY`（inline PEM）让服务端自签。

**(B) WebPlay 刮取** —— 免费，但**非官方，随时可能被 Apple 改掉失效**。请求 `https://beta.music.apple.com` 拿 HTML，用正则匹配出 `index-legacy-*.js` 文件名，再请求那个 JS，用正则匹配 `eyJh...` 的 JWT。这个 token：
- JWT claim 里有 `root_https_origin: ["apple.com"]`，所以所有后端对 Apple 的 fetch 都必须带 `Origin: https://music.apple.com` + 桌面浏览器 User-Agent（`src/lib/appleMusicService.ts` 已做，有测试锁契约）。
- API base 必须用 `https://amp-api.music.apple.com/v1`（Apple Web player 的 endpoint，和 WebPlay token 成对）。
- 有效期约 72 天。过期后重新 scrape，覆盖 `.env` 里的 `APPLE_MUSIC_DEVELOPER_TOKEN`。

## 部署

纯 Next.js 应用，部署到 Vercel：

```bash
npx vercel link     # 只做一次
npx vercel --prod
```

Vercel 自动识别 Next.js；`npm run build` 产出生产 bundle。环境变量在 Vercel 项目 Dashboard 里配（或 `vercel env add`）。

## 脚本

```bash
npm run dev            # next dev（端口 3000）
npm run build          # next build
npm run start          # next start（build 完后跑生产 server）
npm run typecheck      # tsc --noEmit
npm run check          # Biome lint + format + import 排序
npm run check:fix      # 同上，应用 safe autofix
npm run test           # Vitest 单次运行
npm run test:watch     # Vitest watch 模式
npm run test:coverage  # Vitest + v8 coverage
npm run validate       # check + typecheck + test 并行（CI）
npm run clean          # 清理 .next + coverage
```

## 代码质量

- **Biome** 一个二进制处理 lint、formatter、import 排序。配置：[`biome.json`](./biome.json)。
- **TypeScript strict 模式** 覆盖整个 `src/` 树。路径别名 `@/*` → `./src/*`。
- **Vitest 2** 覆盖 `src/lib/**` 和 `src/app/api/**`（Node environment）。
- **Pre-commit 门禁：** `.husky/pre-commit` 每次提交跑 `npm run check` + `npm run typecheck`，测试由 `validate` 运行（CI）。
- 紧急绕过：`git commit --no-verify`，慎用。

## 路线图

- [x] Phase 1 — 项目骨架
- [x] Phase 2 — 后端 service 层
- [x] Phase 3 — React 路由、布局、页面
- [x] Phase 4 — MusicKit 授权流
- [x] Phase 5 — Apple Music 曲库搜索
- [x] Phase 6 — 用户资料库搜索
- [x] Phase 7 — Add-to-library
- [x] Phase 8 — 资料库 playlist 读取
- [x] Phase 9 — 错误处理、empty/loading 状态
- [x] Phase 10 — Vercel 部署（每路由 Serverless 函数）
- [x] Phase 11 — 删除 Express；单一后端 runtime
- [x] Phase 12 — Biome + husky pre-commit 门禁；MusicKitProvider ref→state 重构
- [x] Phase 13 — Vitest 2 + `parseAddToLibraryBody` 种子测试
- [x] Phase 14 — 按原型重写 UI（OKLCH token、primitives、Dashboard 页、响应式 shell）
- [x] Phase 15 — 支持 WebPlay scraped Developer Token，endpoint 切到 `amp-api.music.apple.com`，加 Origin/UA header 及 3 条契约测试
- [x] Phase 16 — 重构到 Next.js 14 App Router（单进程 `next dev`、file-system routing、`src/` 布局、`@/` 别名）
- [ ] 接下来 — Organizer 功能（按艺人/专辑分组、找缺失歌曲、批量加入 playlist）
- [ ] 接下来 — Music User Token 改走服务端 session（替换 `localStorage`）
- [ ] 接下来 — 曲库/资料库结果分页
- [ ] 接下来 — 前端 React 组件测试（`src/` 下配 `jsdom` + `@testing-library/react`）

## 已知限制 (MVP)

- Music User Token 存在 `localStorage`。生产环境应改成 HttpOnly session cookie 或服务端存储。
- 无限流处理 —— Apple 的错误响应原样透传。
- `createLibraryPlaylist` 在 `src/lib/appleMusicService.ts` 里已实现，但暂未暴露为路由。
- **WebPlay token 路径是非官方的**。Apple 改前端 bundle 命名、JWT claim 结构或加更严的 origin 校验，随时可能失效。心里有数再用。
- 本地 HTTP 代理（Clash 等）会拦 `curl localhost:3000`，用 `--noproxy '*'` 或 `unset http_proxy`。
