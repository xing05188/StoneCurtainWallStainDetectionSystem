<template>
  <div class="compare-stack">
    <div class="compare-header">
      <div class="header-title">
        <h1>模型性能对比分析</h1>
      </div>
      <div class="header-actions">
        <button class="ghost-btn" @click="onRefresh" :disabled="pending">
          {{ pending ? '加载中...' : '刷新数据' }}
        </button>
      </div>
    </div>

    <div v-if="pending" class="placeholder-box">
      <div class="loading-spinner"></div>
      <p>正在加载性能数据...</p>
    </div>
    <div v-else-if="error" class="error-box">
      <p>⚠️ 加载失败：{{ error.message }}</p>
    </div>
    <div v-else-if="!detectionRows.length && !classificationRows.length" class="placeholder-box">
      <p>📊 暂无性能数据</p>
    </div>
    
    <div v-else>
      <!-- 物体检测与分割模型对比区块 -->
      <div v-if="detectionRows.length" class="model-type-section">
        <h2 class="section-title">物体检测与分割模型性能对比</h2>
        <div class="compare-grid">
          <div class="chart-card">
            <div class="chart-title">mAP 对比</div>
            <Bar :data="mapBarData" :options="barOptions" />
          </div>
          <div class="chart-card">
            <div class="chart-title">Prec / Recall / F1 雷达图</div>
            <Radar :data="radarData" :options="radarOptions" />
          </div>
          <div class="table-card">
            <div class="chart-title">关键指标表</div>
            <div class="table-header">
              <span>模型</span>
              <span>mAP@0.5</span>
              <span>mAP@0.5:0.95</span>
              <span>Precision</span>
              <span>Recall</span>
              <span>F1</span>
              <span>Latency (ms)</span>
            </div>
            <div v-for="item in detectionRows" :key="item.model" class="table-row">
              <span>{{ item.name || item.model }}</span>
              <span>{{ fmt(item.map50) }}</span>
              <span>{{ fmt(item.map5095) }}</span>
              <span>{{ fmt(item.precision) }}</span>
              <span>{{ fmt(item.recall) }}</span>
              <span>{{ fmt(item.f1 ?? calcF1(item.precision, item.recall)) }}</span>
              <span>{{ item.latency_ms ? item.latency_ms.toFixed(3) : '-' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 分类模型对比区块 -->
      <div v-if="classificationRows.length" class="model-type-section">
        <h2 class="section-title">分类模型性能对比</h2>
        <div class="table-card">
          <div class="chart-title">关键指标表</div>
          <div class="class-table-header">
            <span>模型</span>
            <span>Accuracy</span>
          </div>
          <div v-for="item in classificationRows" :key="item.model" class="class-table-row">
            <span>{{ item.name || item.model }}</span>
            <span>{{ fmtPercent(item.accuracy) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
} from 'chart.js'
import { Bar, Radar } from 'vue-chartjs'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, Filler)

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

type BenchData = {
  detection: BenchmarkItem[]
  classification: BenchmarkItem[]
}

// 直接使用本地静态数据，不调用 API
const mockData: BenchData = {
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

const pending = ref(false)
const error = ref<Error | null>(null)

const onRefresh = () => {
  // 刷新按钮不做任何操作，使用静态数据
  console.log('使用静态数据，无需刷新')
}

// 分离不同类型的模型数据
const detectionRows = computed<BenchmarkItem[]>(() => mockData.detection)
const classificationRows = computed<BenchmarkItem[]>(() => mockData.classification)

// --- 检测模型相关计算属性 ---
const detectionLabels = computed(() => detectionRows.value.map((r) => r.name || r.model))
const palette = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#06b6d4', '#ef4444', '#f59e0b']

const mapBarData = computed(() => ({
  labels: detectionLabels.value,
  datasets: [
    { label: 'mAP@0.5', backgroundColor: palette[0], data: detectionRows.value.map((r) => r.map50 ?? 0) },
    { label: 'mAP@0.5:0.95', backgroundColor: palette[1], data: detectionRows.value.map((r) => r.map5095 ?? 0) }
  ]
}))

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const } },
  scales: { y: { beginAtZero: true, max: 1 } }
}

const radarData = computed(() => ({
  labels: ['Precision', 'Recall', 'F1'],
  datasets: detectionRows.value.map((r, idx) => {
    const color = palette[idx % palette.length]
    return {
      label: r.name || r.model,
      data: [r.precision ?? 0, r.recall ?? 0, r.f1 ?? calcF1(r.precision, r.recall)],
      backgroundColor: color + '33',
      borderColor: color,
      pointBackgroundColor: color,
      fill: true
    }
  })
}))

const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      beginAtZero: true,
      max: 1,
      ticks: { stepSize: 0.2 }
    }
  },
  plugins: { legend: { position: 'bottom' as const } }
}

// --- 辅助函数 ---
const fmt = (v?: number) => (typeof v === 'number' ? v.toFixed(3) : '-')
const fmtPercent = (v?: number) => (typeof v === 'number' ? `${(v * 100).toFixed(2)}%` : '-')
const calcF1 = (p?: number, r?: number) => {
  if (p === undefined || r === undefined || p + r === 0) return 0
  return (2 * p * r) / (p + r)
}

</script>

<style scoped>
.compare-stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 8px;
}

.compare-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(168, 85, 247, 0.05));
  border-radius: 16px;
  border: 1px solid var(--border);
}

.header-title h1 {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.model-type-section {
  margin-bottom: 32px;
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid transparent;
  background: linear-gradient(90deg, var(--border) 0%, transparent 100%) no-repeat bottom;
  background-size: 100% 2px;
  position: relative;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, #3b82f6, #a855f7);
  border-radius: 2px;
}

.compare-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  height: 360px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.chart-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #a855f7);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.chart-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: rgba(59, 130, 246, 0.3);
}

.chart-card:hover::before {
  opacity: 1;
}

.chart-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-title::before {
  content: '';
  width: 4px;
  height: 16px;
  background: linear-gradient(180deg, #3b82f6, #a855f7);
  border-radius: 2px;
}

.table-card {
  grid-column: 1 / -1;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.table-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 1.4fr repeat(6, 1fr);
  gap: 12px;
  font-size: 13px;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
}

.table-header {
  color: var(--muted);
  font-weight: 600;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(168, 85, 247, 0.05));
  border: 1px solid rgba(59, 130, 246, 0.1);
}

.table-row {
  color: var(--text);
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.table-row:hover {
  background: rgba(59, 130, 246, 0.03);
  border-color: rgba(59, 130, 246, 0.15);
  transform: translateX(4px);
}

.table-row span:first-child {
  font-weight: 600;
  color: #3b82f6;
}

/* Styles for Classification Table */
.class-table-header,
.class-table-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  font-size: 13px;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
}

.class-table-header {
  color: var(--muted);
  font-weight: 600;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(6, 182, 212, 0.05));
  border: 1px solid rgba(34, 197, 94, 0.1);
}

.class-table-row {
  color: var(--text);
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.class-table-row:hover {
  background: rgba(34, 197, 94, 0.03);
  border-color: rgba(34, 197, 94, 0.15);
  transform: translateX(4px);
}

.class-table-row span:first-child {
  font-weight: 600;
  color: #22c55e;
}

.error-box, .placeholder-box {
  padding: 60px 20px;
  text-align: center;
  border: 2px dashed var(--border);
  border-radius: 16px;
  color: var(--muted);
  background: rgba(0, 0, 0, 0.01);
  font-size: 15px;
}

.placeholder-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(59, 130, 246, 0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-box {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.02));
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
  font-weight: 500;
}

.ghost-btn {
  padding: 10px 20px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
  color: #3b82f6;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.ghost-btn:hover:not(:disabled) {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.ghost-btn:active:not(:disabled) {
  transform: translateY(0);
}

.ghost-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 960px) {
  .compare-header {
    flex-direction: column;
    text-align: center;
  }
  
  .compare-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-card {
    height: 300px;
  }
  
  .table-header,
  .table-row {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    row-gap: 4px;
  }
  
  .table-header span:nth-child(n+5),
  .table-row span:nth-child(n+5) {
    display: none;
  }
}
</style>