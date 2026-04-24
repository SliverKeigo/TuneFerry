# Apple Music Library Organizer

[English](./README.md) · **简体中文**

一个连接你 Apple Music 账号的 Web 应用：搜索 Apple Music 曲库、搜索你自己的资料库，一键把歌曲/专辑/播放列表加入资料库。以单个 Vercel 项目部署 —— 静态前端 + 每个路由独立的 Serverless 函数，运行在同一域名下。

## 技术栈

- **前端：** React 18 + TypeScript，基于 Vite 构建。刻意使用原生 CSS Modules，暂不引入 UI 框架。
- **后端：** `/api/**` 下每个路由一个 Serverless 函数，运行在 Vercel 的 `@vercel/node` runtime。负责代理 Apple Music API、签发 Developer Token。
- **本地开发：** `vercel dev` 在本机跑同一份函数，Vite 做前端 HMR 并把 `/api` 代理给它。
- **共享代码：** `lib/` 目录存放所有函数共用的 service、type、validator、util。
- **质量门禁：** Biome（lint + format + import 排序）、TypeScript strict、Vitest（覆盖 `lib/` + `api/`）。Biome 与 typecheck 每次提交都由 husky pre-commit 钩子强制执行；测试由 `npm run validate` 运行（CI 推荐）。详见 [代码质量](#代码质量)。

## 项目结构

```
AM-API/
├── api/                          # Vercel Serverless 函数（后端）
│   ├── health.ts                 # GET  /api/health
│   └── apple-music/
│       ├── developer-token.ts    # GET  /api/apple-music/developer-token
│       ├── catalog/
│       │   └── search.ts         # GET  /api/apple-music/catalog/search
│       └── me/library/
│           ├── index.ts          # POST /api/apple-music/me/library
│           ├── search.ts         # GET  /api/apple-music/me/library/search
│           └── playlists.ts      # GET  /api/apple-music/me/library/playlists
├── lib/                          # 所有函数共用的代码
│   ├── appleMusicService.ts      # 所有对 Apple Music 的 REST 调用
│   ├── developerTokenService.ts  # JWT (ES256) 签名 + 进程内缓存
│   ├── env.ts                    # 类型化 env，本地开发加载 dotenv
│   ├── handler.ts                # withErrorHandler, pickQuery, pickHeader, ...
│   ├── httpError.ts              # 带 status + details 的 HttpError
│   ├── validators.ts             # 请求体校验（共享）
│   └── types/appleMusic.ts       # Apple Music 响应类型
├── client/                       # Vite + React + TS 前端
├── vercel.json                   # buildCommand、outputDirectory、SPA rewrite
├── .vercelignore                 # 把 .vercel/ 和 .p8 从部署包中剔除
└── tsconfig.json                 # 对 lib/ + api/ 做 typecheck
```

## 快速开始

本地开发同时跑两个进程：`vercel dev`（提供 `/api/**`）与 Vite（提供带 HMR 的前端，把 `/api` 代理到 `vercel dev`）。

```bash
# 1. 安装依赖
npm install

# 2. 把仓库关联到 Vercel 项目 —— 在 `npm run dev` 之前必做
#    否则 `vercel dev` 的 link 交互会和 Vite 启动抢终端
npx vercel login          # 通过 Vercel 账号做 OAuth
npx vercel link           # 生成 .vercel/ —— 已 gitignore

# 3. 配置环境变量
cp .env.example .env
#   MVP 路线：    往 APPLE_MUSIC_DEVELOPER_TOKEN 里贴一个已签好的 Developer Token
#   签名路线：    填 APPLE_TEAM_ID + APPLE_KEY_ID + APPLE_PRIVATE_KEY（PEM 明文）

# 4. 同时启动前后端
npm run dev
#   vercel dev  →  http://localhost:3000   (serves /api/**)
#   vite        →  http://localhost:5173   (打开这个 —— 会把 /api 代理到 :3000)
```

## 环境变量

完整说明见 [`.env.example`](./.env.example)，关键字段：

| 变量 | 用途 |
| --- | --- |
| `APPLE_MUSIC_DEVELOPER_TOKEN` | 可选的预生成 Token，设置后跳过 JWT 签名流程 |
| `APPLE_TEAM_ID` | Apple Developer Team ID（10 位） |
| `APPLE_KEY_ID` | Media Services (.p8) Key 的 Key ID |
| `APPLE_PRIVATE_KEY` | PEM 明文；**优先级最高**；Vercel 部署**必填** |
| `APPLE_PRIVATE_KEY_PATH` | 本地备选：`.p8` 文件的绝对路径 |
| `APPLE_TOKEN_TTL_SECONDS` | JWT 有效期；默认约 6 个月（Apple 上限） |
| `VITE_API_BASE_URL` | Vite dev 下 `/api` 的代理目标，默认 `http://localhost:3000` |
| `VITE_DEFAULT_STOREFRONT` | 客户端启动时的默认 storefront（`us`、`hk`、`tw`、`jp`、…） |

## 部署到 Vercel

1. **关联仓库、一键发布：**
   ```bash
   npx vercel link       # 只做一次
   git push              # 如果配了 remote
   npx vercel --prod     # 从 CLI 直接部署 production
   ```
   也可以在 Vercel Dashboard 里导入仓库；framework preset 选 "Other"（构建靠根目录 `vercel.json`）。
2. **在 *Project Settings → Environment Variables* 里配置**（或用 `vercel env add`）：
   - MVP：`APPLE_MUSIC_DEVELOPER_TOKEN`
   - 签名：`APPLE_TEAM_ID` + `APPLE_KEY_ID` + `APPLE_PRIVATE_KEY`（PEM 明文，换行保留或转义都行）
   - **不要** 在 Vercel 上用 `APPLE_PRIVATE_KEY_PATH` —— 运行时没有持久文件系统
3. **构建模型：**
   - Vercel 跑 `npm install` 和 `npm run build`，`client/dist` 作为静态资源
   - `/api/**` 下每个 `.ts` 被 `@vercel/node` 独立编译成一个 Serverless 函数；从 `lib/` import 的共享代码会被自动追踪并打包
4. **SPA 路由：** `vercel.json` 的 rewrites 把所有非 `/api/` 的路径重写到 `/index.html`，保证 React Router 在硬刷新时正常。静态文件优先返回（Vercel 的文件系统处理先于 rewrite 执行）。

### Vercel 上的 Developer Token

- MVP 流程：把预签的 Token 贴进 `APPLE_MUSIC_DEVELOPER_TOKEN`，函数原样返回并带上 `Cache-Control: private, max-age=300`。
- 签名流程：把 PEM 内容贴进 `APPLE_PRIVATE_KEY`。`lib/developerTokenService.ts` 在首次请求时用 ES256 签出 JWT，并缓存在热函数的内存里。

## 后端接口

| 方法 | 路径 | 备注 |
| --- | --- | --- |
| GET | `/api/health` | 健康探测 |
| GET | `/api/apple-music/developer-token` | 返回 `{ developerToken }`，客户端缓存 5 分钟 |
| GET | `/api/apple-music/catalog/search?term=&storefront=&types=&limit=` | 曲库搜索代理 |
| GET | `/api/apple-music/me/library/search?term=&types=&limit=` | 需要 `x-music-user-token` |
| POST | `/api/apple-music/me/library` | Body `{ "type": "songs"\|"albums"\|"playlists"\|"music-videos", "ids": string[] }`，需要 `x-music-user-token` |
| GET | `/api/apple-music/me/library/playlists?limit=&offset=` | 需要 `x-music-user-token` |

所有错误统一返回：

```json
{ "error": { "message": "string", "status": 401, "details": "optional" } }
```

## 如何获取 Apple Music Developer Token

1. 加入 [Apple Developer Program](https://developer.apple.com/programs/)。
2. 在 [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/) 控制台创建一个 **Media Services** Key，勾选 *MusicKit*，下载 `.p8` 文件 —— 只能下载一次。
3. 记下 Key ID（在 portal 里）和 Team ID（Apple Developer Console 右上角）。
4. 本地填进 `.env`，生产环境填进 Vercel 的 env vars。`.p8` 文件别放进仓库（已 gitignore）。

## 连接用户

前端从 Apple CDN 加载 [MusicKit on the Web](https://developer.apple.com/documentation/musickitjs) v3。点击 `Connect Apple Music` 后：

1. 从 `/api/apple-music/developer-token` 拉 Developer Token。
2. 调用 `MusicKit.configure({ developerToken, app })`。
3. 弹出 Apple 的授权同意页。
4. 拿到 **Music User Token**，前端存到 `localStorage`，后续请求通过 `x-music-user-token` header 带给后端。

后端从不持久化 Music User Token —— 只是原样转发给 `api.music.apple.com`。

## 脚本

```bash
npm run dev            # vercel dev + vite 并行
npm run build          # 构建前端（api 由 Vercel 在部署时构建）
npm run typecheck      # api + client 并行 tsc
npm run check          # Biome lint + format + import 排序（全仓）
npm run check:fix      # 同上，应用 safe autofix
npm run test           # Vitest 单次运行（lib + api）
npm run test:watch     # Vitest watch 模式
npm run test:coverage  # Vitest 带 v8 coverage
npm run validate       # check + typecheck + test 并行（CI 推荐）
npm run clean          # 清理 client/dist + coverage
```

## 代码质量

- **Biome** 一个二进制处理 lint、formatter、import 排序。配置：[`biome.json`](./biome.json)。
- **TypeScript strict 模式** 覆盖 `lib/`、`api/`、`client/`。
- **Vitest 2** 覆盖 `lib/**` 和 `api/**`（Node environment）。测试文件和源文件并排：`foo.ts` → `foo.test.ts`。配置：[`vitest.config.ts`](./vitest.config.ts)。
- **Pre-commit 门禁：** `.husky/pre-commit` 每次提交都会跑 `npm run check`（Biome，全仓）和 `npm run typecheck`。`npm run validate` 额外跑 `npm test`，CI 应该走 `validate`。
- 紧急情况需绕过时可用 `git commit --no-verify`，慎用。

## 路线图

- [x] Phase 1 — 项目骨架
- [x] Phase 2 — 后端 service 层
- [x] Phase 3 — React router、布局、页面
- [x] Phase 4 — MusicKit 授权流
- [x] Phase 5 — Apple Music 曲库搜索
- [x] Phase 6 — 用户资料库搜索
- [x] Phase 7 — Add-to-library
- [x] Phase 8 — 资料库 playlist 读取
- [x] Phase 9 — 错误处理、empty/loading 状态、README 完善
- [x] Phase 10 — Vercel 部署目标（每路由 Serverless 函数、共享 `/lib`）
- [x] Phase 11 — 删除 Express；单一后端 runtime（本地 `vercel dev`，生产走 function）
- [x] Phase 12 — Biome + husky pre-commit 门禁；MusicKitProvider ref → state 重构（不再需要 hook-deps suppressions）；StrictMode 下的 `MusicKit.configure()` 安全
- [x] Phase 13 — Vitest 2 覆盖 `lib/**` 和 `api/**`，为 `parseAddToLibraryBody` 写了种子测试；`npm run validate` 并行跑 check + typecheck + test
- [ ] 接下来 — Organizer 功能（按艺人/专辑分组、找缺失歌曲、批量加入 playlist）
- [ ] 接下来 — Music User Token 改走服务端 session（替换 `localStorage`）
- [ ] 接下来 — 曲库/资料库结果分页

## 已知限制 (MVP)

- Music User Token 存在 `localStorage`。生产环境应改成 HttpOnly session cookie 或服务端存储。
- Vercel 函数没有显式 CORS —— 依赖浏览器的同源策略（前端与 `/api` 同域）。跨域调用 `/api/apple-music/developer-token` 会成功，这在 MVP 阶段可接受，因为 Developer Token 本身设计上就是要交给浏览器的。
- 无限流处理 —— Apple 的错误响应原样带在错误体的 `details` 字段里透传。
- `createLibraryPlaylist` 在 `lib/appleMusicService.ts` 里已经实现，但暂未暴露为路由。
- 冷启动函数会重新签一次 Developer Token。`jsonwebtoken` ES256 签名约 1ms，廉价但非零开销。
- `vercel dev` 首次 link 需要 Vercel 账号。纯离线开发可以对 preview URL 做调试。
