# TuneFerry

[English](./README.md) · **简体中文**

把 Spotify playlist 迁移到 Apple Music。粘贴一个公开 playlist URL，或者登录 Spotify 拉私有 playlist，TuneFerry 会逐曲在 Apple Music catalog 里匹配（ISRC 优先 + fuzzy 兜底），输出可点击的 deep link 列表 + `.m3u8` 文件。

> **为什么这么做？** Apple Music API 不允许第三方 app 在没有 Apple Developer 订阅的情况下用户资料库里 add 歌。TuneFerry 绕开这个：生成 Apple Music 的 song deep link，你在 iOS / macOS 上点一下，Apple 自家的 client 帮你 add。

## 工作流程

```
Spotify playlist URL 或你的账号
        │
        ▼
   [/import]  ←─ 粘贴 URL，或 Spotify OAuth 后从"我的 playlists"挑
        │
        ▼
   POST /api/match  →  ISRC 查询 → 找不到就 fuzzy artist+title
        │
        ▼
   [/match]  ←─ 置信度标签、手动选候选、勾选包含/排除
        │
        ▼
   [/export]  ←─ deep link 列表（一键复制）+ .m3u8 下载
```

## 技术栈

- **框架：** Next.js 14（App Router）+ React 18 + TypeScript。本地 `next dev` 单进程，端口 3000。
- **样式：** OKLCH CSS 变量 token + inline styles + 小型 `primitives.tsx` 组件库。不引 UI 框架，不用 CSS Modules。
- **Spotify：** 同时支持 Client Credentials（公开 playlist）和 Authorization Code（私有 playlist）。OAuth state 用 HMAC 签名，session 用 HttpOnly cookie。不引 `next-auth` / `iron-session`。
- **Apple Music：** 用 WebPlay-scraped Developer Token 调 `amp-api.music.apple.com`。匹配算法手写（token Jaccard + duration 惩罚），约 30 行。不引 `fuse.js` / `string-similarity`。
- **质量：** Biome（lint + format + import 排序）、TypeScript strict、Vitest（37 个测试）、husky pre-commit hook。

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

### 1. Spotify（必填）

在 <https://developer.spotify.com/dashboard> 注册一个 app：

1. 创建 app，名字随便
2. 添加 Redirect URI：`http://localhost:3000/api/spotify/auth/callback`（生产 URL 也加）
3. 复制 Client ID + Client Secret

```bash
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/auth/callback
SPOTIFY_STATE_SECRET=$(openssl rand -base64 32)
```

### 2. Apple Music Developer Token（必填）

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
# 填 SPOTIFY_CLIENT_ID、SPOTIFY_CLIENT_SECRET、SPOTIFY_STATE_SECRET、APPLE_MUSIC_DEVELOPER_TOKEN

# 3. 启动
npm run dev
# → http://localhost:3000
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
- [x] Phase 17 — **转型 TuneFerry**：删除用户资料库相关代码，加 Spotify Web API 集成（CC + OAuth），建 ISRC + fuzzy 匹配 service，做 Import → Match → Export wizard
- [ ] 接下来 — 迁移历史持久化（Supabase / Vercel Postgres），让用户能继续上次没做完的
- [ ] 接下来 — `matchMany` 加并发（现在串行）
- [ ] 接下来 — 显示 Spotify display name（需要新 `/api/spotify/me` route）
- [ ] 接下来 — iOS Shortcut 导出（一键 add）
- [ ] 接下来 — 前端 React 组件测试（jsdom + @testing-library/react）

## 已知限制 (MVP)

- Apple Music 没有公开的"add to library" API 给非订阅开发者用。deep link 是唯一通用路径：iOS 用户逐个点链接；macOS Music app 也可以 import `.m3u8`。
- WebPlay scraped token 非官方。Apple 改前端 bundle 命名、JWT claim 结构或加严 Origin 检查随时可能失效。生产用户建议走 Apple Developer Program。
- Spotify 私有 playlist 访问需要每次 session 让用户 OAuth 登录（30 天内自动刷 token，超期再登）。
- `matchMany` 串行实现 —— ≤100 首没问题，约 3 秒。如果常迁大 playlist 加并发。
- 本地 HTTP 代理会拦 `curl localhost:3000` —— 见上文。
