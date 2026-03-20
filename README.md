# Stone Curtain Wall Stain Detection System

一个基于前后端分离架构的石材幕墙污渍检测系统，支持图片上传、任务管理、检测结果可视化、历史查询与 PDF 报告导出。

## 功能概览

- 污渍检测任务创建与状态跟踪（`pending / processing / done / failed`）
- 本地模型推理（YOLO）与云端模型推理（HTTP API）双模式
- 检测后图像自动绘制：检测框 + 分割区域 + 标签 + 置信度
- 历史记录查询、失败任务重试
- 原图/处理图签名 URL 访问（Supabase Storage）
- 单条/批量检测结果 PDF 导出

## 项目结构

```text
StoneCurtainWallStainDetectionSystem/
├─ backend/                  # FastAPI 后端
│  ├─ app/
│  │  ├─ api/                # 路由接口
│  │  ├─ core/               # 配置、鉴权、响应封装
│  │  ├─ services/           # 模型适配、Supabase 访问
│  │  ├─ workers/            # 异步任务处理
│  │  └─ schemas/            # 数据模型
│  ├─ models/best.pt         # 本地 YOLO 权重
│  └─ requirements.txt
├─ frontend/                 # Vue 3 + TypeScript 前端
│  ├─ src/pages/detection/   # 检测工作台与历史页面
│  ├─ src/common/apis/       # 接口封装
│  └─ src/common/utils/      # PDF 报告导出等工具
└─ IMPLEMENTATION_NOTES.md
```

## 环境要求

- Python 3.10+
- Node.js 18+
- pnpm 8+
- Supabase 项目（数据库与 Storage Bucket）

## 快速开始

### 1) 启动后端

```powershell
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

后端默认地址：`http://127.0.0.1:8080`

### 2) 启动前端

```powershell
cd frontend
pnpm install
pnpm dev
```

前端默认地址：`http://127.0.0.1:80`（以实际 Vite 输出为准）

## 后端环境变量（backend/.env）

示例关键项：

```env
APP_NAME=Stone Curtain Wall Stain Detection API
APP_ENV=development
APP_PORT=8080
CORS_ORIGINS=http://localhost:80,http://127.0.0.1:80

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
SUPABASE_BUCKET=stain-images
SIGNED_URL_EXPIRES_SECONDS=3600

SYNC_SIZE_THRESHOLD_BYTES=2097152
YOLO_MODEL_PATH=models/best.pt
YOLO_CONFIDENCE_THRESHOLD=0.25

CLOUD_MODEL_URL=
CLOUD_MODEL_API_KEY=
CLOUD_MODEL_IOU_THRESHOLD=0.7
CLOUD_MODEL_IMGSZ=640
CLOUD_MODEL_TIMEOUT_SECONDS=60
```

说明：

- `inference_mode=local`：使用本地 YOLO 模型
- `inference_mode=cloud`：调用云端模型接口

## 主要接口

- `GET /api/health`
- `POST /api/detections`
- `GET /api/detections`
- `GET /api/detections/{id}`
- `POST /api/detections/{id}/retry`
- `GET /api/detections/{id}/signed-url`

`POST /api/detections` 支持 multipart 字段：

- `image`
- `building_name`
- `location_floor`（可选）
- `location_section`（可选）
- `description`（可选）
- `inference_mode`（可选：`local` 或 `cloud`）

## 使用说明

1. 在检测工作台上传图片并加入待检测列表。
2. 在待检测列表每行选择模型（本地/云端）。
3. 上传后系统自动创建任务并轮询状态。
4. 检测完成后可查看原图、处理图、区域明细与统计信息。
5. 可在历史页导出单条或批量 PDF 报告。

## 注意事项

- 请勿将真实生产密钥提交到公开仓库。
- 若云端返回坐标格式变化，后端已做归一化/像素坐标兼容绘制。
- 若本地模型文件路径变更，请同步更新 `YOLO_MODEL_PATH`。

## 许可证

当前仓库未单独声明根级许可证，请按课程/项目要求使用。
