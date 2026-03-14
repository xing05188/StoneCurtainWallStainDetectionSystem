<div align="center">
  <h1>Vue3 通用模板（示例）</h1>
</div>

## 项目简介

这是一个用于二次开发的通用前端模板，基于以下技术栈：

- Vue 3
- Vite
- TypeScript
- Element Plus
- Pinia
- Vue Router

项目内包含若干示例页面、基础布局、路由守卫、请求封装和常用工程化配置，可作为新项目脚手架直接使用。

## 快速启动

要求：Node.js（建议 20+）和 `pnpm`。

```bash
pnpm install
pnpm dev
```

默认开发地址：`http://localhost:80`

## 打包与预览

```bash
pnpm build
pnpm preview
```

## 环境变量

可按需修改以下环境变量：

- `VITE_APP_TITLE`：浏览器标签页标题
- `VITE_BASE_URL`：后端接口基础地址
- `VITE_PUBLIC_PATH`：静态资源公共路径

## 模板化替换建议

将此仓库作为模板时，建议优先替换：

- `package.json` 中的 `name`、`description`、`author`、`repository`
- `.env*` 中的项目标题与接口地址
- `src/layouts`、`src/pages/dashboard` 等入口区域的展示文案
- 通知中心中的示例数据文案
