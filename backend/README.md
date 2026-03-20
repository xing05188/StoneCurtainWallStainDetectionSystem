# Backend (FastAPI)

该目录提供石材幕墙污渍检测后端骨架，负责：

- 接收前端上传图片并创建检测任务
- 调用模型适配器执行检测（同步/异步混合模式）
- 将任务、图片元数据、检测结果写入 Supabase

## Quick Start

```bash
cd backend
start.bat
```

## API

- `GET /api/health`
- `POST /api/detections`
- `GET /api/detections`
- `GET /api/detections/{id}`
- `POST /api/detections/{id}/retry`

`POST /api/detections` 支持额外表单字段：

- `inference_mode`: `local`(默认) 或 `cloud`

## Notes

- YOLO 模型默认读取 `models/best.pt`。你可以直接将模型文件放到该路径。
- 若模型路径不同，设置环境变量 `YOLO_MODEL_PATH` 指向实际位置。
- 当前 `app/services/model_adapter.py` 已接入 `ultralytics` 推理。
- 云端模型可通过 `.env` 配置：`CLOUD_MODEL_URL`、`CLOUD_MODEL_API_KEY`。
- 当前默认依赖 Supabase。请先执行 `sql/001_init_schema.sql` 创建表与策略。
