# Stone Curtain Wall Stain Detection - Implementation Notes

## 已完成内容

### Frontend
- 新增检测 API：`frontend/src/common/apis/detection/`
- 新增检测状态管理：`frontend/src/pinia/stores/detection.ts`
- 新增检测工作台页面：`frontend/src/pages/detection/index.vue`
- 新增检测历史页面：`frontend/src/pages/detection/history.vue`
- 路由接入：`frontend/src/router/index.ts`

### Backend
- FastAPI 项目骨架：`backend/app/`
- 检测接口：`backend/app/api/detections.py`
- 健康检查：`backend/app/api/health.py`
- 鉴权与配置：`backend/app/core/`
- 模型适配器（占位）：`backend/app/services/model_adapter.py`
- Supabase 仓储：`backend/app/services/supabase_repo.py`
- 异步任务入口：`backend/app/workers/tasks.py`

### Supabase
- 初始化 SQL：`backend/sql/001_init_schema.sql`
- 包含数据表、索引、RLS、Storage bucket 与策略

## 启动顺序

1. 在 Supabase SQL Editor 执行：`backend/sql/001_init_schema.sql`
2. 配置后端环境变量：复制 `backend/.env.example` -> `backend/.env`
3. 启动后端：

```bash
cd backend
start.bat
```

4. 启动前端：

```bash
cd frontend
pnpm install
pnpm dev
```

## 模型接入位置

当前已经接入 Ultralytics YOLO 推理。

- 默认模型路径：`models/best.pt`
- 可通过环境变量 `YOLO_MODEL_PATH` 覆盖

你只需将 `best.pt` 放入上述路径即可直接推理。返回结构保持不变：
- `stain_detected`
- `stain_type`
- `severity_level`
- `affected_area_percentage`
- `summary`
- `runtime_ms`
- `overall_cleanliness`
- `regions[]`

## 当前限制（下一步可继续）

- `retry` 已支持从 Storage 回拉历史原图重新推理。
- 异步任务当前使用 FastAPI BackgroundTasks，后续建议替换为 Celery/RQ + Redis。
- 已接入 Signed URL 下发接口：`GET /api/detections/{id}/signed-url`。
