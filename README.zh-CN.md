# TuneFerry

[English](./README.md) · **简体中文**

把**公开**的 Spotify playlist 迁移到 Apple Music。粘贴任意 `open.spotify.com/playlist/...` 链接，TuneFerry 在 Apple Music catalog 里 fuzzy 匹配每首曲，输出可点击的 deep link 列表 + `.m3u8` 文件。

> **零订阅、零 API key**。TuneFerry 通过爬 Spotify 公开 embed 页面读 playlist（任何访问 URL 的人都能看到的同一份数据，无需 Premium / OAuth / client secret）。Apple Music 这头用 WebPlay 刮取的 Developer Token。"add to library" 这一步发生在你自己的设备上 —— TuneFerry 生成 deep link，你点击。

## 工作流程

```
公开的 Spotify playlist URL
        │
        ▼
   [/import]   ←─ 粘 URL，通过 open.spotify.com/embed/<id> 拉数据
        │
        ▼
   POST /api/match   ←─ fuzzy 匹配（token Jaccard + duration 惩罚）
        │
        ▼
   [/match]    ←─ 置信度标签、手动选候选
        │
        ▼
   [/export]   ←─ deep link 列表（一键复制）+ .m3u8 下载
```

## 技术栈

- **框架：** Next.js 14（App Router）+ React 18 + TypeScript。本地 `next dev` 单进程，端口 3000。
- **样式：** OKLCH CSS 变量 token + inline styles + 小型 `primitives.tsx` 组件库。不引 UI 框架，不用 CSS Modules。响应式 layout 走 `globals.css` 里的工具类，单一 820px 断点。
- **i18n：** [next-intl](https://next-intl-docs.vercel.app/) 4.x，client-only 模式（不带 URL 路由）。EN / ZH messages 在 `src/i18n/messages/`，语言切换持久化在已有的 tweaks store 上（Settings → Appearance → Language）。
- **Spotify：** Embed 页面爬取（`https://open.spotify.com/embed/playlist/<id>`）。从 SSR 嵌入的 `__NEXT_DATA__` JSON 里走到 trackList。**无 OAuth、无 API key、无 env 配置**。
- **Apple Music：** 用 WebPlay-scraped Developer Token 调 `amp-api.music.apple.com`。匹配算法手写（token Jaccard + duration 惩罚），约 30 行。不引 `fuse.js` / `string-similarity`。
- **质量：** Biome（lint + format + import 排序）、TypeScript strict、Vitest（**67 个测试，8 个文件** —— 覆盖 `src/lib/**`、`src/app/api/**` route handlers、`src/hooks/**` 纯函数）、husky pre-commit hook。

## 项目结构

```
AM-API/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # 根布局（字体 + Providers）
│   │   ├── globals.css              # OKLCH tokens
│   │   ├── page.tsx                 # / 首页（hero + CTA）
│   │   ├── import/page.tsx          # 第 1 步：粘贴 URL 或从 Spotify 账号选
│   │   ├── match/page.tsx           # 第 2 步：审核匹配，手动覆盖
│   │   ├── export/page.tsx          # 第 3 步：deep link + .m3u8
│   │   ├── settings/page.tsx        # Storefront / Spotify session / Apple token
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── apple-music/
│   │       │   ├── developer-token/route.ts
│   │       │   └── catalog/search/route.ts
│   │       ├── spotify/
│   │       │   └── playlist/route.ts        # GET — 公开 playlist via embed scrape
│   │       └── match/route.ts                # POST — Apple catalog fuzzy 匹配
│   ├── components/                  # primitives、icons、AppShell、Sidebar、TopNav、MobileNav、TweaksPanel、Providers
│   ├── hooks/                       # useLocalStorage、useStorefront、useTweaks（含 sanitizeTweaks 单元测试）
│   ├── i18n/
│   │   ├── I18nProvider.tsx         # 根据 useTweaks().tweaks.locale 选 messages
│   │   └── messages/{en,zh}.json    # 按页面分组的命名空间（nav/home/import/match/export/settings）
│   ├── api/appleMusicApi.ts         # 客户端 fetch 封装
│   ├── types/appleMusic.ts          # 前端 Apple 类型
│   └── lib/
│       ├── appleMusicService.ts     # searchCatalog + findFirstByQuery（Origin/UA 锁住）
│       ├── developerTokenService.ts # 返回 prebaked token，或在配齐 TEAM/KEY 时自签 ES256 JWT
│       ├── env.ts                   # 类型化 env（仅 Apple —— 无 Spotify env 字段）
│       ├── httpError.ts
│       ├── nextHandler.ts           # withErrorHandler / pickQuery / pickHeader / pickInt
│       ├── matchService.ts          # fuzzy 匹配（token Jaccard + duration 惩罚）
│       ├── spotifyService.ts        # extractPlaylistId + fetchPublicPlaylistViaEmbed
│       └── types/{appleMusic,spotify}.ts
├── next.config.js
├── tsconfig.json    # @/* → ./src/*
├── biome.json
└── vitest.config.ts
```

## 快速开始

```bash
# 1. 安装
npm install

# 2. 配置
cp .env.example .env
# 填 APPLE_MUSIC_DEVELOPER_TOKEN（唯一必填）
# 可选 NEXT_PUBLIC_DEFAULT_STOREFRONT（默认 us）

# 3. 启动
npm run dev
# → http://localhost:3000

# 4. 试试
# 打开 /import，粘任意公开 Spotify playlist URL，比如：
#   https://open.spotify.com/playlist/2mZkGiUygMLEzNnawpo0Ya
```

> **本地 HTTP 代理坑：** 如果 shell 里有 `http_proxy` / `https_proxy`（Clash、Surge 等），`curl localhost:3000` 可能 503，因为代理拦了。用 `curl --noproxy '*' http://localhost:3000/...` 或 `unset http_proxy https_proxy`。

## 部署

纯 Next.js 应用，部署到 Vercel：

```bash
npx vercel link    # 一次
npx vercel --prod
```

在 Vercel Dashboard 配 `APPLE_MUSIC_DEVELOPER_TOKEN`（可选 `NEXT_PUBLIC_DEFAULT_STOREFRONT`）即可（或 `vercel env add`）。无任何 Spotify env 变量。

## 脚本

```bash
npm run dev            # next dev（端口 3000）
npm run build          # next build
npm run start          # next start（build 之后跑生产 server）
npm run typecheck      # tsc --noEmit
npm run check          # Biome lint + format + import 排序
npm run check:fix      # 同上 + autofix
npm run test           # Vitest 单次
npm run test:watch     # Vitest watch 模式
npm run test:coverage  # Vitest + v8 coverage
npm run validate       # check + typecheck + test 并行（CI）
npm run clean          # 清 .next + coverage
```

## 代码质量

- **Biome** —— lint + format + import 排序。配置：[`biome.json`](./biome.json)。
- **TypeScript strict** 覆盖整个 `src/`。路径别名 `@/*` → `./src/*`。
- **Vitest 2** 覆盖 `src/lib/**`、`src/app/api/**` route handlers 和 `src/hooks/**` 纯函数 —— Phase 21 起 **67 个测试，8 个文件**。`vitest.config.ts` 镜像 tsconfig 的 `@/*` → `./src/*` 别名，让 route 测试能用同一种 import。
- **Pre-commit 门禁：** `.husky/pre-commit` 每次 commit 跑 `check` + `typecheck`。测试在 `validate`（CI）里跑。
- **不要随便 `git commit --no-verify`**，除非真的卡住。

## 路线图

- [x] Phase 1–14 — Apple Music Library Organizer 原型（见 git history）
- [x] Phase 15 — WebPlay scraped Developer Token + amp-api endpoint
- [x] Phase 16 — 重构到 Next.js 14 App Router
- [x] Phase 17 — 转型 TuneFerry：Spotify Web API + OAuth + ISRC matching wizard（之后又重做 —— 见 Phase 18）
- [x] Phase 18 — **彻底放弃 Spotify Web API**（2024 年起被 Premium 锁定）。改成爬公开 playlist 的 embed 页面。删 OAuth 整套、删 ISRC 分级、简化 `/import` 和 `/settings`。净 −1500 / +400 行，零订阅
- [x] Phase 19 — 测试覆盖回填：`/api/spotify/playlist` 和 `/api/match` 的 route handler 集成测试 + `pickQuery`/`pickHeader`/`pickInt` / `findFirstByQuery` / `getDeveloperToken` 单元测试。Vitest 加 `@/*` alias 镜像 tsconfig。**34 → 59 测试**
- [x] Phase 20 — **next-intl i18n（EN / ZH，不带 URL 路由）**。Locale 持久化到 `useTweaks` store，`<html lang>` 同步，nav + 5 个页面完整 messages。新增 `sanitizeTweaks`（每个枚举字段 allow-list，含新加的 `locale`）+ `TweaksProvider` mounted gate 消除 SSR hydration 警告。Sidebar 加宽到 268px，TopNav 提到 64px 并在 1280 列内居中。**+8 测试覆盖 sanitizer / 自我治愈写路径**
- [x] Phase 21 — **响应式 layout，断点 820px**（与 AppShell 的 mobile media query 同步）。每页 `<main>`、Match 行、sticky bar、Export 双列 grid、PageHeader、SectionHeader、Settings/Tweaks Row 全部走 `globals.css` 工具类让 `@media` 能 cascade。Mobile（≤820px）下三卡 / 五列 / 双列 grid 折成单列、PageHeader right 区下沉、候选 popover 收窄、sticky bar 提到 MobileNav 之上、写死的 oklch 暗色换成 `var(--bg-2)` 让浅色主题不再闪烁。Playwright 1440 / 768 / 375 三个 viewport 端到端验证
- [ ] 接下来 — 多 storefront 自动 retry（在 us 没匹配的曲自动 fallback hk/tw/jp）
- [ ] 接下来 — `matchMany` 加并发（现在串行）
- [ ] 接下来 — iOS Shortcut 导出（一键 add）
- [ ] 接下来 — 前端 React 组件测试（jsdom + @testing-library/react）
- [ ] 接下来 — 迁移历史持久化（用户跨 session 能继续）
- [ ] 接下来 — locale / theme 持久化到 cookie，让 server `RootLayout` 直接读，彻底消除 hydration 后默认值→用户值的瞬时切换

