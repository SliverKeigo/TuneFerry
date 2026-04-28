# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 交流语言

默认用**中文**与用户沟通。技术标识符（变量名、文件路径、API 名、CLI 命令等）保持英文原样。

## 产品定位

**TuneFerry —— Spotify → Apple Music playlist 迁移工具**。绝大部分原"Apple Music Library Organizer"的代码已删（用户资料库写入需要 Apple Developer Program 订阅 + 用户在 apple.com 域名登录，浏览器 Origin 锁死了，scraped token 走不通）。**现在的核心流程是 Import → Match → Export，全部不需要用户在 Apple 端 authorize**。

## 运行时约束

**纯 Next.js 14 App Router 项目，部署在 Vercel。不要加回 Vite、Express 或 `@vercel/node` 函数。**

- 框架：Next.js 14.x + React 18，App Router（`src/app/**`）
- 后端 = `src/app/api/**/route.ts`（Next.js route handlers，按 `GET` / `POST` 命名 export）
- 前端 = `src/app/**/page.tsx`（file-system routing），每个 page 文件以 `'use client'` 起头
- 共享业务代码 = `src/lib/*.ts`
- 路径别名 = `@/*` → `./src/*`；所有 import 用 `@/lib/...` / `@/components/...` / `@/hooks/...` 而非相对路径
- 本地开发 = `npm run dev`（就是 `next dev`），单进程、单端口 3000
- `.env`：Next.js 自动加载；客户端可见的变量必须前缀 `NEXT_PUBLIC_*`

## 质量门禁

**唯一工具链是 Biome + TypeScript strict + Vitest + husky pre-commit。不要引入 ESLint、Prettier、stylelint、lint-staged 或其他 lint/format 工具。**

- `npm run check` = Biome 全仓
- `npm run typecheck` = tsc --noEmit
- `npm run test` = Vitest（覆盖 `src/lib/**`、`src/app/api/**`、`src/hooks/**`，当前 67 测试 8 文件）
- `npm run validate` = 上面三个并行
- `.husky/pre-commit` 每次 commit 跑 `check` + `typecheck`（test 不进 gate）
- Commit 失败时**不要**建议 `--no-verify`，先 `npm run check:fix` 再手修

## Commit / PR

- Conventional Commits：`type(scope): subject`，常用 type：`feat`、`fix`、`refactor`、`chore`、`docs`、`perf`、`test`
- 分支策略 = 直接 commit 到 `main`（单人 MVP）
- 无 CI，pre-commit gate 是唯一自动检查

## 双 README 同步

根目录有两份 README：`README.md`（英文）和 `README.zh-CN.md`（中文）。**任一份变更后，必须把对应内容同步到另一份**。`/sync-readme` slash command 可触发系统化同步。

## 前端样式约定

**不要用 CSS Modules**。所有样式走两条路：

1. **全局 token / 工具类**：`src/app/globals.css` 定义 OKLCH CSS 变量（`--accent`、`--panel`、`--text`、`--hairline` 等）和工具类
   - **基础**：`.panel`、`.kbd`、`.input-native`、`.app-bg`、`.page-enter`
   - **响应式 layout**（820px 断点，与 AppShell mobile 切换同步）：
     - `.page-main` + 变体（`--home / --import / --form / --match / --export / --settings`）替代每页 `<main>` 的 padding/maxWidth
     - `.page-header` / `.section-header`（mobile 下 right 区下沉单列）
     - `.cards-3`（Home 三卡 → mobile 单列）
     - `.match-row` / `.match-sticky-bar` / `.match-candidate-popover`（Match 行折叠 + sticky bar 加 `bottom: 64px` 让位 MobileNav）
     - `.export-grid`（Export 双列 → mobile 单列）
     - `.settings-row` / `.settings-row--narrow`（Settings/TweaksPanel Row 单列堆叠）
   - **新增内联样式如果有 padding / grid / flex 这种 layout 关键字段，优先看能不能落到 utility class** —— inline style 优先级高于 class，写到 inline 就让 `@media` rule 失效。Visual chrome（color/border/shadow）保留 inline 没问题。
2. **组件内 inline styles**：`style={{ ... }}` 写在组件里，读 CSS 变量

**组件库在 `src/components/primitives.tsx`** —— 写新页面时**优先复用**（Button、Pill、StatusDot、AddButton、Segmented、PageHeader、SectionHeader、StatCard、Artwork、ToastProvider + useToast 等）。图标统一从 `src/components/icons.tsx` namespace import：`import * as Icon from '@/components/icons'` 然后 `<Icon.Search size={18} />`。

**Client components**：任何用 React hooks、浏览器 API 或 `onClick`/`onChange` 的组件都必须 `'use client';` 起头。

**主题 / 外观 / 语言可切**：`useTweaks()` 管 theme (dark/light) / surface (glass/flat) / nav (sidebar/topnav) / accentHue / locale (en/zh)，持久化到 `localStorage['am.tweaks']`，镜像到 `<html>` 的 `data-*` 属性、`lang` 属性和 `--accent-h`。`<TweaksPanel />` 在 Settings 页。

- **持久化值统一过 `sanitizeTweaks()`** —— 所有枚举字段（含 accentHue 数字白名单）用 allow-list 强校验，hydrated 出非法值就 fallback 默认。这是为了防止旧 / 手改的 localStorage 让 `MESSAGES[tweaks.locale]` 等 indexed lookup 拿到 undefined 把整棵 tree 炸掉。`setTweak` 写入路径同样跑一次 sanitize 自我治愈。新增枚举字段时务必同步更新 `VALID_*` Set。
- **SSR hydration**：`TweaksProvider` 用 `mounted` gate，第一次 client render 强制走 `DEFAULT_TWEAKS` 跟 SSR 输出一致，`useEffect` 后才读 localStorage。这是为了消除 React hydration 警告。视觉上仍有一次默认→用户值的快速切换，可接受 —— 想彻底消除需要把 locale/theme 持久化到 cookie 让 server `RootLayout` 直接读，目前不做。

## i18n 约定

**唯一库：next-intl 4.x，client-only mode（不带 i18n routing）**。

- Messages = `src/i18n/messages/{en,zh}.json`，结构按 page 域分组（`nav` / `home` / `import` / `match` / `export` / `settings`）
- `<I18nProvider>` 在 `src/i18n/I18nProvider.tsx`，根据 `useTweaks().tweaks.locale` 选 messages，挂在 `Providers.tsx` 的 `TweaksProvider → I18nProvider → ToastProvider → AppShell` 链上
- 组件内：`const t = useTranslations('namespace')`；带占位符用 `t('key', { count })`；带 React 节点用 `t.rich('key', { code: (chunks) => <code>{chunks}</code> })`
- **不要在 messages JSON 写 HTML entities**（`&lt;` / `&gt;`）—— next-intl 不解码，会按字面渲染。占位符用 `[id]` 这类 ASCII。`<code>` 等长字符串记得加 `wordBreak: 'break-all'`，否则窄屏溢出
- **不翻 API contract message**：API route 返回的 `error.message`、JWT payload 字段、storefront 代码（`us`/`gb`）都是数据契约 / 数据本身，保留英文。前端只翻 UI 文案
- 加新文案先在 `en.json` 加 key、立刻同步 `zh.json`（结构必须一一对应，否则 next-intl 在缺失语言下静默 fallback 到 key 字符串）
- Locale 切换在 Settings → Appearance → Language（English / 中文）

## Spotify 集成约定

**唯一路径：embed 页面爬取**。Spotify Web API 自 2024 年起被 Premium 锁，整套 OAuth 已删。

- `fetchPublicPlaylistViaEmbed(idOrUrl)` 在 `src/lib/spotifyService.ts` —— 唯一对外函数
- 数据源 = `https://open.spotify.com/embed/playlist/<id>` 的 SSR `__NEXT_DATA__` script
- 需要带 desktop User-Agent 的 fetch（Spotify 对 non-browser UA 可能 429/403）
- 走 `props.pageProps.state.data.entity.{name, subtitle, coverArt, trackList}` 的链路；任何 hop 失败抛 `HttpError(404, 'Playlist not found or shape unexpected')`
- 没有 ISRC、没有 album name —— 只 title + subtitle(artist) + duration + 30s preview
- **限制**：算法 playlist (`37i9...`) 上限 50 首，用户 playlist 上限约 100 首。私有 playlist 不可访问
- Risk profile 和 Apple WebPlay-scraped token 一样：非官方、Spotify 改前端就坏。文档要明示

**没有 SPOTIFY_* env 变量。`.env` 完全没 Spotify 字段**。如果未来想拉私有 playlist，只能要求用户订阅 Spotify Premium 重新加 OAuth 流（git history `e2c4...` 之前的版本可参考）。

## Apple Music 约定（已定型，不要改）

- **WebPlay-scraped Developer Token** 是默认路径（不是标准 $99 Apple Developer 自签）。Token 在 `.env` 的 `APPLE_MUSIC_DEVELOPER_TOKEN`；`developerTokenService.ts` 原样返回
- Scraped token 的 JWT claim 里有 `root_https_origin: ["apple.com"]`，Apple 服务端强制校验 —— `appleMusicService.ts` 里所有 fetch 通过 `appleFetch` wrapper 自动带 `Origin: https://music.apple.com` + 桌面 UA。**新增任何调 Apple 的代码必须用 `appleFetch`，不要绕开**。有锁契约的测试（`appleMusicService.test.ts`）
- API base = `https://amp-api.music.apple.com/v1`
- Scraped token 约 72 天过期；过期重爬 `beta.music.apple.com` 替换 `.env`
- **不再有 user library 写入功能**（Music User Token 路径已删，因为 scraped token 无法走 MusicKit.authorize()）
- ISRC 查询：`/v1/catalog/{storefront}/songs?filter[isrc]={isrc}` —— `URLSearchParams` 处理 brackets 编码 OK，可以走 `appleFetch`
- **本地 dev 坑**：shell 有 `http_proxy` / `https_proxy`（如 Clash）时 curl localhost:3000 会被丢进代理 → 503。用 `curl --noproxy '*'` 或 `unset http_proxy https_proxy`

## 匹配算法约定

`src/lib/matchService.ts` 自实现，**不引第三方 fuzzy 库**（`fuse.js`/`string-similarity` 等都不要）。

- **只走 fuzzy**：embed 没有 ISRC，没有 album name。`searchCatalog({ term: name + artist })` → token Jaccard 相似度，duration ±8s 加分。
- 阈值：≥0.85 → `'high'`、≥0.6 → `'low'`、否则 `'none'`。`MatchConfidence` 类型只有这 3 档（之前的 `'exact'` 已删）
- **不要加并发**：MVP 串行，100 首约 3 秒，够了。如果用户抱怨慢再 `Promise.all` 分批

## Route handler 约定

- `src/app/api/**/route.ts` 每个文件按 method export 函数
- 用 `@/lib/nextHandler` 的 `withErrorHandler` 包裹，错误统一返回 `{ error: { message, status, details? } }`
- 读查询/header 用 `pickQuery` / `pickHeader` / `pickInt`
- 不要重新实现 `requireMethod` —— App Router 按函数名分发，错 method 自动 405

## 测试

- **Vitest 2.x** 覆盖 `src/lib/**`、`src/app/api/**` route handlers、`src/hooks/**` 纯函数（Node environment）。测试文件和源文件并排
- **`vitest.config.ts` 必须 mirror `tsconfig.json` 的 `@/*` → `./src/*` 别名**（route handler 用 `@/lib/...`，否则 Vitest 解析不到）。新增任何 path alias 时两边都要同步
- 常用命令：`npm test` / `npm run test:watch` / `npm run test:coverage`
- Route handler integration tests 用 `vi.mock` 替换底层 service，只测 body 解析 + envelope 形状（参考 `src/app/api/match/route.test.ts`）
- 模块级 frozen state（如 `developerTokenService` 读 `env`）用 `vi.doMock + vi.resetModules + dynamic import` 隔离 case
- **前端 React 组件测试尚未配置** —— 需要 `jsdom` + `@testing-library/react`。但 hook 内的纯函数（如 `sanitizeTweaks`）可以 export 出来直接 Node env 测试，免装 jsdom（参考 `src/hooks/useTweaks.test.ts`）
- 写新功能尽量同步加 `*.test.ts`。纯函数（matcher、parsers、validators、sanitizer）优先；route handler 加 integration test 锁定 envelope

## 文档结构

- `docs/` 在 `.gitignore`，本地临时产物
- 没有 `specs/` 目录、没有 phase 实施文档 —— 设计讨论走对话，产出写进 README 的 Roadmap / Known Limitations
- `ui-design/` 是当年 Apple Music Organizer 的原型参考（gitignored），实际 UI 在 `src/` 下
