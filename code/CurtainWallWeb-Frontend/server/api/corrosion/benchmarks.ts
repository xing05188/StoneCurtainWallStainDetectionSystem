/**
 * 接口名称: 模型性能对比数据
 * 接口定义: GET /api/corrosion/benchmarks -> GET {apiBase}{benchmarkPath}
 * 输入内容: 无
 * 输出内容: JSON { success: boolean; data: { detection: BenchmarkItem[]; classification: BenchmarkItem[] } }
 * 备注: 使用 runtimeConfig.public.benchmarkPath（默认 /benchmarks）指向后端固定接口。
 */
import { defineEventHandler, createError } from 'h3'

// 定义数据项类型，增加 accuracy 字段用于分类模型
type BenchmarkItem = {
  model: string
  name?: string
  map50?: number
  map5095?: number
  precision?: number
  recall?: number
  f1?: number
  fps?: number
  latency_ms?: number
  accuracy?: number
}

// 前端本地 mock，当后端尚未提供 benchmarks 接口时可用
// 使用了您提供的真实数据，并按模型类型进行了划分
const mockData = {
  detection: [
    { model: 'yolo11n_rust_train1', name: 'YOLO11n (Rust Train 1)', map50: 0.76685, map5095: 0.66011, precision: 0.75808, recall: 0.57825, latency_ms: 0.199 },
    { model: 'yolo11n_rust_train2', name: 'YOLO11n (Rust Train 2)', map50: 0.76685, map5095: 0.66011, precision: 0.75808, recall: 0.57825, latency_ms: 0.199 },
    { model: 'yolo11s_rust_train1', name: 'YOLO11s (Rust Train 1)', map50: 0.73075, map5095: 0.70855, precision: 0.77181, recall: 0.6151, latency_ms: 0.7129 },
    { model: 'yolo11s_rust_train2', name: 'YOLO11s (Rust Train 2)', map50: 0.76937, map5095: 0.65271, precision: 0.75413, recall: 0.61943, latency_ms: 0.0199 },
    { model: 'yolo11s_preproc_v1', name: 'YOLO11s (Preproc v1)', map50: 0.78101, map5095: 0.64398, precision: 0.73963, recall: 0.57621, latency_ms: 0.199 },
    { model: 'yolo11s_preproc_v2', name: 'YOLO11s (Preproc v2)', map50: 0.68315, map5095: 0.72949, precision: 0.74308, recall: 0.58055, latency_ms: 0.199 },
    { model: 'rust_seg_v2', name: 'Rust Segmentation v2', map50: 0.76937, map5095: 0.65271, precision: 0.75413, recall: 0.61943, latency_ms: 0.0199 }
  ],
  classification: [
    { model: 'rust_regression_class', name: 'Rust Regression/Class', accuracy: 0.7333 }
  ]
}

export default defineEventHandler(async () => {
  // 直接返回本地 mock 数据，无需调用后端
  return { success: true, data: mockData, mock: true }
})