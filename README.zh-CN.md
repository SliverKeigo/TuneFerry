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
- **样式：** OKLCH CSS 变量 token + inline styles + 小型 `primitives.tsx` 组件库。不引 UI 框架，不用 CSS Modules。
- **Spotify：** Embed 页面爬取（`https://open.spotify.com/embed/playlist/<id>`）。从 SSR 嵌入的 `__NEXT_DATA__` JSON 里走到 trackList。**无 OAuth、无 API key、无 env 配置**。
- **Apple Music：** 用 WebPlay-scraped Developer Token 调 `amp-api.music.apple.com`。匹配算法手写（token Jaccard + duration 惩罚），约 30 行。不引 `fuse.js` / `string-similarity`。
- **质量：** Biome（lint + format + import 排序）、TypeScript strict、Vitest（34 个测试）、husky pre-commit hook。

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
│   │       │   ├── auth/{login,callback,logout}/route.ts
│   │       │   ├── playlist/route.ts        # 公开
│   │       │   └── me/{playlists,playlist}/route.ts  # 私有
│   │       └── match/route.ts
│   ├── components/                  # primitives、icons、AppShell、Sidebar、TopNav、MobileNav、TweaksPanel、Providers
│   ├── hooks/                       # useLocalStorage、useStorefront、useTweaks
│   ├── api/appleMusicApi.ts         # 客户端 fetch 封装
│   ├── types/appleMusic.ts          # 前端 Apple 类型
│   └── lib/
│       ├── appleMusicService.ts     # searchCatalog + findByIsrc + findFirstByQuery
│       ├── developerTokenService.ts # 从 env 读 token（或自签）
│       ├── env.ts                   # 类型化 env（Apple + Spotify）
│       ├── httpError.ts
│       ├── nextHandler.ts           # withErrorHandler / pickQuery / pickHeader / pickInt
│       ├── matchService.ts          # ISRC + fuzzy 匹配
│       ├── spotifyService.ts        # Spotify Web API + OAuth + state 签名
│       ├── spotifySession.ts        # cookie 助手
│       └── types/{appleMusic,spotify}.ts
├── next.config.js
├── tsconfig.json    # @/* → ./src/*
├── biome.json
└── vitest.config.ts
```

## 配置

### Spotify

**啥也不用**。无 env 变量、无 app 注册、无 OAuth。TuneFerry 从 `https://open.spotify.com/embed/playlist/<id>` 读公开 playlist 数据 —— 这是 Spotify 给所有访问 URL 的人都返回同一份 SSR 数据，第三方 reader 也能用。

**限制**：
- **公开 playlist 才行**。先在 Spotify 把 playlist 设公开
- **每个 playlist 最多 100 首**。embed 截断更长的。Spotify 算法 playlist（`37i9...` ID，比如 *Today's Top Hits*、*Top 50*）上限是 50 首
- **没有"我的 playlist 列表"**。每次迁移从粘 URL 开始

### Apple Music Developer Token（必填）

**两条路：**

**(A) WebPlay 刮取 —— 免费，非官方，约 72 天过期**
- 请求 `https://beta.music.apple.com`，找到 `index-legacy-*.js` 文件名，请求那个 JS，正则匹配 `eyJh...` JWT
- 贴进 `APPLE_MUSIC_DEVELOPER_TOKEN`
- Token 的 `root_https_origin: ["apple.com"]` claim 强制要求请求带 Origin。后端自动在每次 Apple 调用上加 `Origin: https://music.apple.com` + 桌面 UA（有 `appleMusicService.test.ts` 锁契约）
- API base：`amp-api.music.apple.com/v1`（Apple Web player 的 endpoint，和该 token 成对）

**(B) Apple Developer Program —— $99/年，官方，6 个月有效期**
- 创建 Media Services key（勾 MusicKit），下载 `.p8`
- 预签 token 贴进 `APPLE_MUSIC_DEVELOPER_TOKEN`
- 或设 `APPLE_TEAM_ID` + `APPLE_KEY_ID` + `APPLE_PRIVATE_KEY`（inline PEM），后端自签

完整字段见 [`.env.example`](./.env.example)。

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

在 Vercel Dashboard 配同样的环境变量（或 `vercel env add`）。注意把 `SPOTIFY_REDIRECT_URI` 改成生产 URL，并在 Spotify app 后台同步注册。

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
- **Vitest 2** 覆盖 `src/lib/**`（Phase 17 时是 37 个测试）。
- **Pre-commit 门禁：** `.husky/pre-commit` 每次 commit 跑 `check` + `typecheck`。测试在 `validate`（CI）里跑。
- **不要随便 `git commit --no-verify`**，除非真的卡住。

## 路线图

- [x] Phase 1–14 — Apple Music Library Organizer 原型（见 git history）
- [x] Phase 15 — WebPlay scraped Developer Token + amp-api endpoint
- [x] Phase 16 — 重构到 Next.js 14 App Router
- [x] Phase 17 — 转型 TuneFerry：Spotify Web API + OAuth + ISRC matching wizard（之后又重做 —— 见 Phase 18）
- [x] Phase 18 — **彻底放弃 Spotify Web API**（2024 年起被 Premium 锁定）。改成爬公开 playlist 的 embed 页面。删 OAuth 整套、删 ISRC 分级、简化 `/import` 和 `/settings`。净 −1500 / +400 行，零订阅
- [ ] 接下来 — 多 storefront 自动 retry（在 us 没匹配的曲自动 fallback hk/tw/jp）
- [ ] 接下来 — `matchMany` 加并发（现在串行）
- [ ] 接下来 — iOS Shortcut 导出（一键 add）
- [ ] 接下来 — 前端 React 组件测试（jsdom + @testing-library/react）
- [ ] 接下来 — 迁移历史持久化（用户跨 session 能继续）

## 已知限制 (MVP)

- **公开 playlist 才行，≤100 首**。Spotify embed 是唯一数据源；私有 playlist 需要 Web API（已被 Premium 锁），embed 对大 playlist 截断。
- **没有 ISRC = 只能 fuzzy 匹配**。embed 不暴露 ISRC，所以不能用 ID 精准匹配。流行曲一般 'high' 置信度；冷门 / 区域独占 / 改名严重的曲可能落到 'low' 或 'none'。用户可以在 `/match` 手动从候选里挑。
- **Storefront 敏感**。匹配率严重依赖该曲在所选 Apple Music storefront 是否存在。中文歌经常在 `us` 没结果但 `hk` / `tw` 有。可在 Settings 切 storefront 重试。
- **Apple Music 没有给非订阅开发者用的"add to library" API**。deep link 是唯一通用路径：iOS 用户逐个点链接；macOS Music app 也可 import `.m3u8`。
- **WebPlay 刮取 token（Apple + Spotify embed 都是）非官方**。任何一边改前端 bundle 都可能失效。生产用户建议走付费替代。
- **`matchMany` 串行**实现 —— ≤100 首约 3 秒。如果觉得慢加并发。
- **本地 HTTP 代理**（Clash、Surge）会拦 `curl localhost:3000` —— 用 `--noproxy '*'` 或 `unset http_proxy https_proxy`。
