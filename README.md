# 扫地机器人 · 灵感种草工作台

独立的 React + Vite 本地预览项目，复用原有网页视觉形式。产品图片为示意图，非实拍。

工作流输入：`product`（T20 Pro 月白、T20 Pro 曜石黑、T10 月白、S1 Max 标准版、S1 Max 上下水版）、`campaign`（最多 20 字）、`audience`（最多 60 字）、`want`（只要文案 / 文案 + 配图 / 文案 + 配图 + 视频）、`shot`（选填，最多 500 字）。

本地界面：`pnpm install` 后执行 `pnpm dev`，访问 http://127.0.0.1:5174/。当前预览不包含真实 Dify 密钥；连接工作流后才能生成真实文案、配图和视频。

Cloudflare Worker 在服务器端读取 `DIFY_API_BASE` 和 `DIFY_API_KEY`，仅应为此项目配置对应工作流的密钥，切勿放进网页或提交 Git。工作流审核为“转人工”时不会进入配图步骤；没有图片时不会生成视频。实际结果以工作流为准。

## Vercel 与本机接口

`api/generate.js` 使用 Node 内置 fetch，通过服务端环境变量连接 Dify。`vercel.json` 将该接口的最长运行时间设为 600 秒；Vercel 套餐和 Fluid Compute 设置必须支持该时长。接口采用 Dify 流式模式，生成期间请保持网页打开。

本机先安装项目已有的 React / Vite 等依赖，再执行 `node dev-server.js`，服务会先构建网页，地址为 http://localhost:3003/。在项目根目录的 `local.env` 自行填写该工作流的 Dify API 地址和密钥；不要提交或分享这个文件。部署到 Vercel 时在项目环境变量中设置同名的 `DIFY_API_BASE` 和 `DIFY_API_KEY`；部署在云端的服务不能用 `localhost` 访问个人电脑上的 Dify。
