# TuneFerry

[English](./README.md) · **简体中文**

把**公开**的 Spotify 或网易云音乐 playlist 迁移到 Apple Music。粘贴任意 `open.spotify.com/playlist/...` 或 `music.163.com/playlist?id=...` 链接，TuneFerry 在 Apple Music catalog 里 fuzzy 匹配每首曲，输出可点击的 Apple Music 深链列表（外加一个 iOS Shortcut 一键批量加 playlist），把歌单带回家。

> **零订阅、零 API key**。TuneFerry 通过爬 Spotify 公开 embed 页面读 playlist（任何访问 URL 的人都能看到的同一份数据，无需 Premium / OAuth / client secret）。Apple Music 这头用 WebPlay 刮取的 Developer Token。"add to library/playlist" 这一步发生在你自己的设备上 —— TuneFerry 生成 deep link，你点击。

## 工作流程

```
公开的 playlist URL（Spotify / 网易云）
        │
        ▼
   [/import]   ←─ 粘 URL，自动识别来源，走 embed 爬取或 v6 API 拉数据
        │
        ▼
   POST /api/match   ←─ fuzzy 匹配（token Jaccard + duration 惩罚）
        │
        ▼
   [/match]    ←─ 置信度标签、手动选候选
        │
        ▼
   [/export]   ←─ Apple Music 深链列表 + iOS Shortcut 批量加 playlist
```

## 技术栈

- **框架：** Next.js 14（App Router）+ React 18 + TypeScript。本地 `next dev` 单进程，端口 3000。
- **样式：** OKLCH CSS 变量 token + inline styles + 小型 `primitives.tsx` 组件库。不引 UI 框架，不用 CSS Modules。响应式 layout 走 `globals.css` 里的工具类，单一 820px 断点。
- **i18n：** [next-intl](https://next-intl-docs.vercel.app/) 4.x，client-only 模式（不带 URL 路由）。EN / ZH messages 在 `src/i18n/messages/`，语言切换持久化在已有的 tweaks store 上（Settings → Appearance → Language）。
- **Spotify：** Embed 页面爬取（`https://open.spotify.com/embed/playlist/<id>`）。从 SSR 嵌入的 `__NEXT_DATA__` JSON 里走到 trackList。**无 OAuth、无 API key、无 env 配置**。
- **网易云音乐：** 公开 API 两段式 fetch（`/api/v6/playlist/detail` 拿 meta + trackIds，再分批 `/api/song/detail` 拿完整 song）。匿名访问，无 cookie，无加密。URL 解析器处理 4 种网易云 URL 形态 + 裸数字 ID。
- **Apple Music：** 用 WebPlay-scraped Developer Token 调 `amp-api.music.apple.com`。匹配算法手写（token Jaccard + duration 惩罚），约 30 行。不引 `fuse.js` / `string-similarity`。
- **质量：** Biome（lint + format + import 排序）、TypeScript strict、Vitest（**121 个测试，11 个文件** —— 多源迁移完成后 —— 覆盖 `src/lib/**`、`src/app/api/**` route handlers、`src/hooks/**` 纯函数）、husky pre-commit hook。

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
│   │   ├── export/page.tsx          # 第 3 步：Apple Music 深链列表 + Shortcut 批量加面板
│   │   ├── settings/page.tsx        # Storefront / 外观 / Apple token
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── apple-music/
│   │       │   ├── developer-token/route.ts
│   │       │   └── catalog/search/route.ts
│   │       ├── netease/
│   │       │   └── playlist/route.ts         # GET — 公开 playlist via /api/v6 + /api/song/detail
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
│       ├── neteaseService.ts        # extractPlaylistId + fetchPublicPlaylist（v6 + song/detail）
│       ├── sourceDetector.ts        # 从 URL 识别 SourceType（'spotify' | 'netease'）
│       ├── spotifyService.ts        # extractPlaylistId + fetchPublicPlaylistViaEmbed
│       └── types/{appleMusic,netease,source,spotify}.ts
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
- **Vitest 2** 覆盖 `src/lib/**`、`src/app/api/**` route handlers 和 `src/hooks/**` 纯函数 —— **121 个测试，11 个文件** —— 多源迁移完成后。`vitest.config.ts` 镜像 tsconfig 的 `@/*` → `./src/*` 别名，让 route 测试能用同一种 import。
- **Pre-commit 门禁：** `.husky/pre-commit` 每次 commit 跑 `check` + `typecheck`。测试在 `validate`（CI）里跑。
- **不要随便 `git commit --no-verify`**，除非真的卡住。
