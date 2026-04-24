---
name: deploy-preview
description: Validate the repo, push a preview deployment to Vercel, and print the preview URL. Use when the user asks to "deploy preview", "ship a preview", "push to Vercel", or wants to share a testable link before production.
disable-model-invocation: true
---

# /deploy-preview — 一键 preview 部署

这是一个**有副作用**的 workflow，只能由用户通过 `/deploy-preview` 触发（不会自动调用）。

## 前置检查（先确认，别跳过）

1. **Git 干净吗？** `git status`。如果有未提交改动，问用户要不要先 commit。Preview 部署可以部署 dirty tree，但部署出来的 URL 和 git SHA 对不上时不易追溯。
2. **Vercel linked？** 查 `.vercel/project.json` 是否存在。如果没有，告诉用户先跑 `npx vercel login && npx vercel link`。
3. **env 同步了吗？** 对比 `.env` 和 Vercel Dashboard 的环境变量。跑 `npx vercel env ls` 看线上的变量名单，和本地 `.env` 的 key 做集合对比，列出 missing / only-local / only-remote 的 key。**不要打印 value**，只比对 key 是否存在。

## 执行

1. **跑 validate。** `npm run validate`（Biome check + typecheck 并行）。任一失败就停，告诉用户修好再来，**不要**用 `--no-verify` 跳 pre-commit 风格的绕过。
2. **部署 preview。** `npx vercel deploy`（默认 preview，不是 `--prod`）。捕获输出里的 URL。
3. **打印结果。** 返回：
   - Preview URL（对应最新 HEAD SHA）
   - 当前 git SHA（`git rev-parse --short HEAD`）
   - 当前分支
   - env 比对结果摘要
4. **询问后续。** 默认结束；如果用户说"一切好，推 prod"，再跑 `npx vercel --prod`。

## 反模式（不要做）

- 不要自作主张在 `git push` 或 `gh pr create`。此 skill 只是 preview 部署，不动 remote。
- 不要在 env 缺失时"帮用户补上" —— 只报告差异，让用户决定。
- 不要把 `.env` 的真实值打印到任何地方（包括 commit message 或 console）。
- 不要 bypass 本地 pre-commit hook。
