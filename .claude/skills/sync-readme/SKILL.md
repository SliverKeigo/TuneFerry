---
name: sync-readme
description: Compare README.md (English) and README.zh-CN.md (Simplified Chinese) side-by-side, spot content drift, and propose synchronized edits so both stay 1:1. Trigger after any README edit or when the user asks to "sync readme" or "update Chinese readme".
---

# /sync-readme — 中英 README 同步

本项目根目录有两份 README：

- `README.md` — 英文版，主版本
- `README.zh-CN.md` — 简体中文版，结构与英文版一一对应

任何一份修改后必须同步另一份。这个 skill 做系统化检查。

## 流程

1. **读双份。** 把 `README.md` 和 `README.zh-CN.md` 完整读入。
2. **结构对齐检查。** 按章节 (`## xxx`) 切分，对比两份的章节顺序与标题映射：
   - 英文 `## Quick Start` ↔ 中文 `## 快速开始`
   - 英文 `## Deploying to Vercel` ↔ 中文 `## 部署到 Vercel`
   - 等等
   列出两份各有但对方没有的章节（drift 的明显信号）。
3. **逐节内容对比。** 对每对章节，找：
   - 新增段落（一份有，一份没有）
   - 命令/代码块差异（应保持一致）
   - 表格行差异（例如环境变量表、接口表）
   - 列表项差异（Roadmap、Known Limitations）
4. **找出落后方。** 通过 `git log -p README.md` 和 `git log -p README.zh-CN.md` 最近几条对比，看哪一份更新。落后方 = 需要补丁的那份。
5. **提出差异清单。** 用 Markdown 列出所有发现，每一项标注：
   - 哪个章节
   - 英文内容 / 中文内容
   - 建议动作（添加到 zh / 添加到 en / 两边都改）
6. **让用户确认后再写。** 用 AskUserQuestion 问"全部同步" / "让我挑" / "先不改"。同步时保留既有翻译风格（专有 API 名保留英文，叙述用中文）。
7. **验证。** 改完跑 `npm run check`（Biome 不检查 markdown，但 hook 不会误改；验证纯粹用于确认没意外改动其他文件）。

## 注意事项

- 代码块、命令、文件路径、shell 命令、`APPLE_*` 环境变量名称**永远保持英文**。
- 中文译名约定：
  - Serverless 函数（首字母大写）
  - 资料库（不是"库"）
  - 曲库（catalog）
  - 授权（authorize / authorisation）
  - 门禁 / 闸门（gate）
  - 路由（route）
  - 存储前（storefront，通常也直接保留英文）
- 不要用翻译工具盲翻；按英文意思重新组织中文句式。
- 两份 README 顶部的语言切换链接不需要翻译（固定文案）。
