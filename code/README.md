# Stone Curtain Wall Stain Detection System

一个基于前后端分离架构的石材幕墙污渍检测系统，支持图片上传、任务管理、检测结果可视化、历史查询与 PDF 报告导出。

## 功能概览

- 污渍检测任务创建与状态跟踪（`pending / processing / done / failed`）
- 本地模型推理（YOLO）与云端模型推理（HTTP API）双模式
- 检测后图像自动绘制：检测框 + 分割区域 + 标签 + 置信度
- 历史记录查询、筛选、失败任务重试、单条/批量删除
- 原图/处理图签名 URL 访问（OSS 对象存储）
- 单条/批量检测结果 PDF 导出
- 图片压缩（上传前自动压缩大图）
- 前端待上传队列管理（支持批量添加、逐条配置、进度跟踪）
- JWT 用户认证与路由鉴权

## 项目结构

```text
StoneCurtainWallStainDetectionSystem/
├─ stain_new_backend/                     # FastAPI 后端
│  ├─ app/
│  │  ├─ api/                # 路由接口（health、detections）
│  │  ├─ core/               # 配置、JWT 鉴权、响应封装
│  │  ├─ schemas/            # Pydantic 数据模型
│  │  ├─ services/           # 模型适配器（YOLO + Cloud API）、MySQL 仓库
│  │  ├─ workers/            # 后台异步任务处理
│  │  └─ main.py             # 应用入口
│  ├─ models/                # YOLO 模型文件（需自行放入 best.pt）
│  ├─ sql/                   # 数据库建表脚本
│  ├─ .env.example           # 环境变量模板
│  ├─ Dockerfile             # Docker 镜像构建文件
│  ├─ docker-compose.yml     # Docker Compose 编排文件
│  ├─ DEPLOY.md              # Docker 部署详细指南
│  ├─ requirements.txt       # Python 依赖
│  └─ start.bat              # 本地开发启动脚本
├─ CurtainWallWeb-Frontend/              # Nuxt.js 3 前端（SSR 关闭）
│  ├─ api/                   # 接口封装（detections、stain、user 等）
│  ├─ composables/           # 组合式函数（认证、待上传队列、图表等）
│  ├─ components/            # 通用组件
│  ├─ layouts/               # 布局组件（导航栏、用户菜单等）
│  ├─ middleware/            # 路由中间件（全局鉴权）
│  ├─ pages/                 # 页面
│  │  ├─ stonedirty/         # 污渍检测模块（mainpage、detection、history）
│  │  ├─ corrosion/          # 腐蚀检测模块
│  │  ├─ crackdetect/        # 裂缝检测模块
│  │  ├─ glass-inspection/   # 玻璃检测模块
│  │  ├─ resilience/         # 韧性评估模块
│  │  ├─ vibration/          # 振动监测模块
│  │  └─ auth/               # 登录/注册页面
│  ├─ server/api/            # Nitro 服务端 API（代理转发）
│  ├─ types/                 # TypeScript 类型定义
│  ├─ utils/                 # 工具函数（PDF 导出、图片压缩、请求封装）
│  └─ nuxt.config.ts         # Nuxt 配置
├─ IMPLEMENTATION_NOTES.md
├─ SRS_石材幕墙污渍检测系统.pdf
└─ README.md
```

## 环境要求

- Python 3.10+
- Node.js 18+
- pnpm 8+
- MySQL 8.0+
- OSS 对象存储服务（兼容 MinIO / S3）

## 快速开始

### 1) 后端

```powershell
cd stain_new_backend
pip install -r requirements.txt
# 编辑 .env 配置 MySQL、OSS、JWT 等
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8081
```

后端默认地址：`http://127.0.0.1:8081`

### 2) 前端

```powershell
cd CurtainWallWeb-Frontend
pnpm install
pnpm dev
```

前端默认地址：`http://127.0.0.1:3000`（以实际 Vite 输出为准）

### 3) 初始化数据库

```powershell
mysql -h your-mysql-host -u stain -p stain < stain_new_backend/sql/final_detection_schema.sql
```

## 后端环境变量（stain_new_backend/.env）

```env
APP_NAME=Stone Curtain Wall Stain Detection API
APP_ENV=production
CORS_ORIGINS=http://localhost:80

# OSS 对象存储
OSS_BASE_URL=http://your-oss-host:9000
OSS_UPLOAD_ENDPOINT=/oss/upload/output
OSS_USERNAME=stain-detection
OSS_PASSWORD=change-me

# MySQL 数据库
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_USER=stain
MYSQL_PASSWORD=change-me
MYSQL_DATABASE=stain

# JWT 密钥（用于 token 验证）
JWT_SECRET=change-me

# 模型运行参数
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
- `SYNC_SIZE_THRESHOLD_BYTES`：小于此值（默认 2MB）的图片同步处理，大于此值异步后台处理

## 主要接口

所有接口以 `/api` 为前缀，需在 Header 中携带 `Authorization: Bearer <token>`。

| 方法   | 路径                            | 说明             |
|--------|--------------------------------|------------------|
| GET    | `/api/health`                  | 健康检查          |
| POST   | `/api/detections`              | 创建检测任务       |
| GET    | `/api/detections`              | 查询检测列表       |
| GET    | `/api/detections/{id}`         | 获取任务详情       |
| POST   | `/api/detections/{id}/retry`   | 重试失败任务       |
| GET    | `/api/detections/{id}/signed-url` | 获取图片签名 URL |
| DELETE | `/api/detections/{id}`         | 删除单个任务       |
| DELETE | `/api/detections/batch/delete` | 批量删除任务       |

`POST /api/detections` 支持 multipart 字段：

- `image` - 图片文件（jpg/png）
- `building_name` - 建筑名称
- `location_floor`（可选）- 楼层
- `location_section`（可选）- 区域
- `description`（可选）- 描述
- `inference_mode`（可选，默认 `local`）- `local` 或 `cloud`

响应格式统一为：

```json
{
  "code": 0,
  "data": { ... },
  "message": "success"
}
```

## 数据库表结构

系统使用 MySQL，包含 4 张核心表：

- **inspection_tasks** — 检测任务主表（状态、建筑信息、污渍检测结果）
- **task_images** — 图片元数据表（原图/处理图 OSS 路径、文件大小、MIME 类型）
- **detection_results** — 检测结果表（运行指标 JSON、处理时间）
- **result_regions** — 检测区域明细表（标签、置信度、边界框坐标）

## 使用说明

1. 在检测工作台（`/stonedirty`）上传图片，图片将加入待检测列表。
2. 在待检测列表中为每张图片选择模型模式（本地/云端）。
3. 可以逐条上传或批量上传所有待检测项，上传后自动创建检测任务并轮询状态。
4. 检测完成后可查看原图、处理图、区域明细与统计信息。
5. 可在历史页（`/stonedirty/history`）按状态、建筑名、时间范围筛选，导出单条或批量 PDF 报告。
6. 支持失败任务一键重试，以及单条/批量删除任务。

## 主要技术栈

### 后端
- **框架**: FastAPI + Uvicorn
- **数据库**: MySQL 8.0+（pymysql）
- **模型推理**: Ultralytics YOLO（本地）/ HTTP API（云端）
- **图像处理**: Pillow + NumPy
- **认证**: PyJWT（HS256）
- **部署**: Docker + Docker Compose

### 前端
- **框架**: Nuxt.js 3（CSR 模式）
- **UI**: Nuxt UI + Element Plus
- **状态管理**: Pinia / useState
- **PDF 生成**: jsPDF + html2canvas
- **HTTP 请求**: Axios
- **工具库**: VueUse, dayjs, ECharts, Three.js

## Docker 部署

```powershell
cd stain_new_backend

# 放入 YOLO 模型文件
mkdir models
# 将 best.pt 放入 models/ 目录

# 配置环境变量
copy .env.example .env
# 编辑 .env 填入实际配置

# 初始化数据库
mysql -h your-mysql-host -u stain -p stain < sql/final_detection_schema.sql

# 构建并启动
docker compose up -d --build
```

后端服务监听 `http://localhost:8081`。

更详细的 Docker 部署说明请参考 [stain_new_backend/DEPLOY.md](./stain_new_backend/DEPLOY.md)。

## 注意事项

- 请勿将真实生产密钥提交到公开仓库。
- YOLO 模型文件 `best.pt` 需自行准备并放入 `stain_new_backend/models/` 目录。
- 若云端返回坐标格式有差异，后端已做归一化/像素坐标兼容绘制。
- 前端通过 Nitro devProxy 将 `/detection-api/api/*` 代理到后端 `http://localhost:8081`。