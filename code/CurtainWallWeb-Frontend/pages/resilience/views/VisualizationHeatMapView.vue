<template>
  <div class="heatmap-container">
    <!-- 标题和操作区 -->
    <div class="heatmap-header">
      <h2>幕墙韧性热力图分析</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="refreshHeatmap" :loading="loading">
          <el-icon><refresh /></el-icon>
          <span>刷新数据</span>
        </el-button>
        <el-button @click="exportImage" class="export-btn">
          <el-icon><download /></el-icon>
          <span>导出图片并上传为报告素材</span>
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="heatmap-content">
      <el-card shadow="hover" class="control-panel">
        <div class="panel-header">
          <el-icon><setting /></el-icon>
          <span>分析参数配置</span>
        </div>
        
        <el-form label-width="100px" label-position="left" class="analysis-form">
          <el-form-item label="选择分析任务" prop="job_id">
            <div class="job-select-wrapper">
              <el-button type="primary" @click="showJobDialog" class="job-select-btn">
                <el-icon v-if="selectedJob == null"><Plus /></el-icon>
                <span>{{ selectedJob == null ? '选择分析任务': `【${selectedJob.job_name}】`}}</span>
              </el-button>
            </div>

            <el-dialog
              title="选择分析任务"
              v-model="jobDialogVisible"
              :width="dialogWidth"
            >
              <JobsView v-if="jobDialogVisible" @job-selected="handleJobSelected" key="job-selector"/>
            </el-dialog>
          </el-form-item>
          
          <el-form-item label="颜色方案">
            <el-select v-model="colorScheme" style="width: 100%">
              <el-option
                v-for="scheme in colorSchemes"
                :key="scheme.value"
                :label="scheme.label"
                :value="scheme.value"
              >
                <div class="color-scheme-option">
                  <span class="scheme-label">{{ scheme.label }}</span>
                  <span class="scheme-preview" :style="`background: ${scheme.preview}`"></span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
          
          <el-form-item label="显示数值">
            <el-switch v-model="showValue" />
          </el-form-item>

          <el-form-item label="选择维度">
            <el-select 
              v-model="selectedDimension" 
              placeholder="请选择维度" 
              @change="onDimensionChange" 
              style="width: 100%"
              :loading="isLoadingOptions && !selectedDimension"
              :disabled="isLoadingOptions && !selectedDimension"
            >
              <el-option v-for="dim in dimensionOptions" :key="dim.value" :label="dim.label" :value="dim.value" />
            </el-select>
            <!-- 维度加载提示 -->
            <p v-if="isLoadingOptions && !selectedDimension" class="loading-tip">
              <el-icon size="14" class="rotating-icon"><Refresh /></el-icon>
              <span>正在获取维度，请稍候...</span>
            </p>
          </el-form-item>

          <el-form-item label="选择方法">
            <el-select 
              v-model="selectedMethod" 
              placeholder="请选择方法" 
              @change="onSelectionChange" 
              style="width: 100%"
              :loading="isLoadingOptions && selectedDimension"
              :disabled="!selectedDimension || (isLoadingOptions && selectedDimension)"
            >
              <el-option v-for="method in methodOptions" :key="method" :label="method" :value="method" />
            </el-select>
            <!-- 方法加载提示 -->
            <p v-if="isLoadingOptions && selectedDimension" class="loading-tip">
              <el-icon size="14" class="rotating-icon"><Refresh /></el-icon>
              <span>正在获取方法，请稍候...</span>
            </p>
          </el-form-item>
          
          <el-form-item>
            <el-button 
              type="primary" 
              @click="createHeatmap" 
              style="width: 100%"
              :disabled="!selectedDimension || !selectedMethod || isLoadingOptions"
              class="apply-btn"
            >
              应用参数
            </el-button>
          </el-form-item>
        </el-form>

      </el-card>
      
      <!-- 热力图绘制区 -->
      <div class="visualization-area">
        <el-card shadow="hover" class="heatmap-card">
          <div class="card-header">
            <div class="title">幕墙韧性评分热力图</div>
            <div class="subtitle" v-if="selectedJob">
              当前任务: {{ selectedJob.job_name }} | 
              更新时间: {{ formatDateTime(selectedJob.finished_at) }}
            </div>
          </div>
          <div class="heatmap-wrapper">
            <div ref="heatmapChart" class="heatmap-chart">            
                <el-empty
                description="请先选择一个分析任务以查看热力图结果"
                :image-size="120"
                v-if="selectedJob == null"
              />
            </div>
          </div>
          
          <div class="stats-container">
            <el-row :gutter="20">
              <el-col :span="6">
                <statistic-card title="最高值" :value="maxValue.toFixed(2)" icon="top" />
              </el-col>
              <el-col :span="6">
                <statistic-card title="最低值" :value="minValue.toFixed(2)" icon="bottom" />
              </el-col>
              <el-col :span="6">
                <statistic-card title="平均值" :value="avgValue.toFixed(2)" icon="data-line" />
              </el-col>
              <el-col :span="6">
                <statistic-card title="标准差" :value="stdValue.toFixed(2)" icon="trend-charts" />
              </el-col>
            </el-row>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import { ElMessage, ElLoading } from 'element-plus'
import {
  Refresh,
  Download,
  Setting,
  Top,
  Bottom,
  DataLine,
  TrendCharts,
  Plus
} from '@element-plus/icons-vue'
import StatisticCard from '../components/StatisticCard.vue'
import { formatDateTime } from '../utils/format'
import JobsView from '../views/AnalysisJobView.vue'
import axios from 'axios'
import { apiUrl } from '../config'

// 图表实例
let heatmapInstance: echarts.ECharts | null = null
let legendInstance: echarts.ECharts | null = null

// 数据相关
const loading = ref(false)
const isLoadingOptions = ref(false) // 维度/方法选项加载状态
const selectedJob: Ref< { id: string; job_name: any; finished_at: any } | null> = ref(null)
const selectedJobID = ref('')
const job_id = ref('')

// 响应式对话框宽度
const dialogWidth = computed(() => {
  const screenWidth = window.innerWidth;
  return screenWidth > 1600 ? '80%' : screenWidth > 1200 ? '70%' : '90%';
});

// 热力图参数
const colorScheme = ref('viridis')
const cellSize = ref(20)
const showValue = ref(false)
const minValue = ref(0)
const maxValue = ref(1)
const avgValue = ref(0)
const stdValue = ref(0)
const availableData = ref({})

watch(selectedJob, async (newJob) => {
  if (newJob) {
    isLoadingOptions.value = true // 开始加载维度
    await fetchHeatmapData();
    isLoadingOptions.value = false // 维度加载完成
  } else {
    // 清空任务时重置选项
    dimensionOptions.value = []
    methodOptions.value = []
    selectedDimension.value = ''
    selectedMethod.value = ''
  }
});

// 原始数据从后端拉取
const fetchedData = ref([])

// 选项
const dimensionOptions = ref<{ value: string; label: string; }[]>([])
const methodOptions: Ref<string[]> = ref([])

const selectedDimension = ref('')
const selectedMethod = ref('')

const onDimensionChange = () => {
  selectedMethod.value = ''
  methodOptions.value = []
  
  isLoadingOptions.value = true // 开始加载方法
  nextTick(async () => {
    try {
      const dimObj = fetchedData.value.find(item => Object.keys(item)[0] === selectedDimension.value)
      if (dimObj) {
        const methodObj = dimObj[selectedDimension.value]
        methodOptions.value = Object.keys(methodObj)
      }
    } catch (error) {
      ElMessage.error('获取方法列表失败')
      console.error('方法列表获取失败:', error)
    } finally {
      isLoadingOptions.value = false // 方法加载完成
    }
  })
}

const onSelectionChange = () => {
  if (selectedDimension.value && selectedMethod.value) {
    HeatMapData.value = [];

    const matchedEntry = fetchedData.value.find(entry =>
      entry[selectedDimension.value]
    );

    if (matchedEntry && matchedEntry[selectedDimension.value]) {
      const methodData = matchedEntry[selectedDimension.value][selectedMethod.value];

      if (Array.isArray(methodData)) {
        HeatMapData.value = methodData.map((item: { [x: string]: any; batch: any }) => {
          const score = item["score"] ?? item["平均得分"] ?? item["稳定评分"];
          return {
            batch: item.batch,
            score: score
          };
        }).filter((item: { score: undefined }) => item.score !== undefined);
      }
    }
    
    nextTick(() => {
      createHeatmap();
    });
  }
};

// 展示分析任务对话框部分
const jobDialogVisible = ref(false)
const showJobDialog = () => {
  jobDialogVisible.value = true
}
function handleJobSelected(row: { id: string; job_name: any } | null) {
  selectedJob.value = row
  console.log('选中的任务：', row)
  if(row) {
    job_id.value = row.id
    selectedJobID.value = row.id
  }
  jobDialogVisible.value = false
}

// 颜色方案选项
const colorSchemes = ref([
  {
    label: 'Viridis',
    value: 'viridis',
    preview: 'linear-gradient(to right, #440154, #482475, #414487, #355f8d, #2a788e, #21908d, #22a884, #42be71, #7ad151, #bddf26, #bddf26)'
  },
  {
    label: 'Plasma',
    value: 'plasma',
    preview: 'linear-gradient(to right, #0d0887, #46039f, #7201a8, #9c179e, #bd3786, #d8576b, #ed7953, #fb9f3a, #fdca26, #f0f921)'
  },
  {
    label: 'Inferno',
    value: 'inferno',
    preview: 'linear-gradient(to right, #000004, #1b0c41, #4a0c6b, #781c6d, #a52c60, #cf4446, #ed6925, #fb9b06, #f7d13d, #fcffa4)'
  },
  {
    label: 'Magma',
    value: 'magma',
    preview: 'linear-gradient(to right, #000004, #180f3d, #440f76, #721f81, #9e2f7f, #cd4071, #f1605d, #fd9668, #feca8d, #fcfdbf)'
  },
  {
    label: '热力红黄',
    value: 'red-yellow',
    preview: 'linear-gradient(to right, #fff7ec, #fee8c8, #fdd49e, #fdbb84, #fc8d59, #ef6548, #d7301f, #b30000, #7f0000)'
  }
])

// DOM 引用
const heatmapChart = ref(null)
const legendChart = ref(null)
const HeatMapData = ref([])

const createHeatmap = async () => {
  if (!selectedJob.value?.id) {
    ElMessage.warning('请先选择分析任务')
    return
  }

  loading.value = true
  try {
    const response = await axios.get(
      `${apiUrl}/visualization/heatmap/${selectedJob.value.id}/`,
      {
        params: {
          dimension: selectedDimension.value,
          method: selectedMethod.value
        }
      }
    )

    const responseData = response.data.data
    if (!responseData) {
      throw new Error('未获取到有效数据')
    }

    const { batch_labels, indicator_labels, score_matrix } = responseData
    const heatmapData = [];

    // 计算统计信息
    const allScores = score_matrix.flatMap(batch => batch.scores)
    minValue.value = Math.min(...allScores)
    maxValue.value = Math.max(...allScores)
    avgValue.value = allScores.reduce((sum, score) => sum + score, 0) / allScores.length
    stdValue.value = Math.sqrt(
      allScores.map(score => Math.pow(score - avgValue.value, 2))
        .reduce((sum, squaredDiff) => sum + squaredDiff, 0) / allScores.length
    )

    const ITEMS_PER_COLUMN = 40;
    const totalItems = batch_labels.length;
    const columnCount = Math.ceil(totalItems / ITEMS_PER_COLUMN);
    
    const newBatchLabels = [];
    for (let col = 0; col < columnCount; col++) {
      newBatchLabels.push(`批次组 ${col + 1}`);
    }

    for (let col = 0; col < columnCount; col++) {
      const startIdx = col * ITEMS_PER_COLUMN;
      const endIdx = Math.min(startIdx + ITEMS_PER_COLUMN, totalItems);

      for (let batchIdx = startIdx; batchIdx < endIdx; batchIdx++) {
        heatmapData.push([
          col,
          batchIdx % ITEMS_PER_COLUMN,
          score_matrix[batchIdx].scores[0]
        ]);
      }
    }

    // 配置图表选项
    const option = {
      tooltip: {
        position: 'top',
        formatter: (params) => {
          const [colIdx, rowIdx, score] = params.data;
          const originalBatchIdx = colIdx * ITEMS_PER_COLUMN + rowIdx;
          return `
            <div style="margin-bottom:5px;font-weight:bold">批次: ${batch_labels[originalBatchIdx]}</div>
            <div>指标: structural_composite_score</div>
            <div>得分: ${score.toFixed(3)}</div>
          `;
        }
      },
      grid: {
        top: 80,
        bottom: 100,
        left: 150,
        right: 100
      },
      xAxis: {
        type: 'category',
        data: newBatchLabels,
        splitArea: { show: true },
        axisLabel: {
          show: false,
          rotate: 45,
          interval: 0
        }
      },
      yAxis: {
        type: 'category',
        data: Array.from({ length: ITEMS_PER_COLUMN }, (_, i) => `行 ${i + 1}`),
        splitArea: { show: true }
      },
      visualMap: {
        min:0,
        max:1,
        calculable: true,
        inRange: { color: getColorRange() },
        orient: 'horizontal',
        left: 'center',
        top: 30
      },
      series: [{
        name: '得分',
        type: 'heatmap',
        data: heatmapData,
        label: { show: showValue.value },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };

    if (!heatmapInstance) {
      heatmapInstance = echarts.init(heatmapChart.value)
    }
    heatmapInstance.setOption(option)

    availableData.value = {
      dimension: responseData.dimension,
      method: responseData.method,
      riskDistribution: responseData.metadata.risk_distribution,
      weights: responseData.metadata.weights
    }

  } catch (error) {
    console.error('热力图数据获取失败:', error)
    ElMessage.error('热力图数据获取失败')
  } finally {
    loading.value = false
  }
}

const handleResize = () => {
  heatmapInstance?.resize()
  legendInstance?.resize()
}
const drawLegend = () => {
  if (!legendChart.value) return;
  
  if (!legendInstance) {
    legendInstance = echarts.init(legendChart.value);
  }

  const option = {
    tooltip: {
      show: false
    },
    visualMap: {
      type: 'continuous',
      min: minValue.value,
      max: maxValue.value,
      inRange: {
        color: getColorRange()
      },
      orient: 'vertical',
      itemWidth: 20,
      itemHeight: 200,
      calculable: false,
      hoverLink: false,
      text: ['', '']
    }
  };
  
  legendInstance.setOption(option);
};
const getColorRange = () => {
  switch (colorScheme.value) {
    case 'viridis':
      return ['#440154', '#482475', '#414487', '#355f8d', '#2a788e', '#21908d', 
              '#22a884', '#42be71', '#7ad151', '#bddf26', '#bddf26']
    case 'plasma':
      return ['#0d0887', '#46039f', '#7201a8', '#9c179e', '#bd3786', '#d8576b', 
              '#ed7953', '#fb9f3a', '#fdca26', '#f0f921']
    case 'inferno':
      return ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', 
              '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4']
    case 'magma':
      return ['#000004', '#180f3d', '#440f76', '#721f81', '#9e2f7f', '#cd4071', 
              '#f1605d', '#fd9668', '#feca8d', '#fcfdbf']
    case 'red-yellow':
      return ['#fff7ec', '#fee8c8', '#fdd49e', '#fdbb84', '#fc8d59', '#ef6548', 
              '#d7301f', '#b30000', '#7f0000']
    default:
      return ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', 
              '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
  }
}

watch ([selectedDimension, selectedMethod], () => {
  if(selectedDimension.value && selectedMethod.value) {
    HeatMapData.value = []

    const matchedEntry = fetchedData.value.find(entry =>
      entry[selectedDimension.value]
    )

    if (matchedEntry && matchedEntry[selectedDimension.value]) {
      const methodData = matchedEntry[selectedDimension.value][selectedMethod.value]

      if (Array.isArray(methodData)) {
        HeatMapData.value = methodData.map((item: { [x: string]: any; batch: any }) => {
          const score = item["score"] ?? item["平均得分"] ?? item["稳定评分"]
          return {
            batch: item.batch,
            score: score
          }
        }).filter((item: { score: undefined }) => item.score !== undefined)
      }
    }
  }
})

const fetchHeatmapData = async () => {
  try {
    isLoadingOptions.value = true
    const response = await axios.get(`${apiUrl}/analysis/jobs/${selectedJobID.value}/`)
    fetchedData.value = response.data.data.result
    dimensionOptions.value = fetchedData.value.map(item => {
      const dimension = Object.keys(item)[0];
      return { value: dimension, label: dimension };
    });
    selectedDimension.value = ''
    selectedMethod.value = ''
    methodOptions.value = []
  } catch (error) {
    ElMessage.error('分析结果获取失败')
    console.error('分析结果获取失败:', error)
    dimensionOptions.value = []
    methodOptions.value = []
  } finally {
    isLoadingOptions.value = false
    drawLegend()
  }
}

const refreshHeatmap = () => {
  if (selectedJob.value) {
    isLoadingOptions.value = true
    fetchHeatmapData().finally(() => {
      isLoadingOptions.value = false
    })
  }
}

const exportImage = async () => {
  if (!heatmapInstance) {
    ElMessage.warning('请先生成热力图')
    return
  }

  if (!selectedJob.value?.id) {
    ElMessage.error('请先选择关联的分析任务')
    return
  }

  const loading = ElMessage.info('正在处理图片...')

  try {
    const url = heatmapInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
      excludeComponents: ['toolbox']
    })

    const blob = await fetch(url).then(res => res.blob())
    const fileName = `heatmap_${selectedJob.value.id}_${Date.now()}.png`
    const file = new File([blob], fileName, { type: 'image/png' })

    const formData = new FormData()
    formData.append('job_id', selectedJob.value.id)
    formData.append('heatmap', file)
    formData.append('dimension', selectedDimension.value)
    formData.append('method', selectedMethod.value)

    const [_, uploadResponse] = await Promise.all([
      new Promise<void>((resolve) => {
        const link = document.createElement('a')
        link.href = url
        link.download = `热力图_${selectedJob.value.job_name || '未命名'}_${formatDateTime(new Date())}.png`
        document.body.appendChild(link)
        link.click()
        setTimeout(() => {
          document.body.removeChild(link)
          resolve()
        }, 100)
      }),
      
      axios.post(`${apiUrl}/visualization/upload/heatmap/${selectedJob.value.id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      })
    ])

    ElMessage.success({
      message: `热力图保存成功！`,
      duration: 5000
    })
    
  } catch (error) {
    let errorMessage = "上传失败！";
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    ElMessage.error(errorMessage);
    
  } finally {
    loading.close()
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  heatmapInstance?.dispose()
  legendInstance?.dispose()
})

watch([colorScheme, showValue], () => {
  if (HeatMapData.value.length > 0) {
    createHeatmap();
  }
});

watch([colorScheme, showValue, cellSize], () => {
  fetchHeatmapData()
})

onMounted(() => {
  window.addEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
.heatmap-container {
  padding: 16px;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  background-color: #f9fafb;

  .heatmap-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;

    h2 {
      font-size: 20px;
      color: #1d2129;
      margin: 0;
      font-weight: 600;
    }

    .action-buttons {
      display: flex;
      gap: 12px;

      .export-btn {
        color: #409eff;
        border-color: #409eff;
        background-color: #ecf5ff;

        &:hover {
          background-color: #e6f2ff;
          color: #3a8ee6;
          border-color: #3a8ee6;
        }
      }
    }
  }

  .heatmap-content {
    flex: 1;
    display: flex;
    gap: 20px;
    height: calc(100% - 70px);

    .control-panel {
      width: 360px;
      flex-shrink: 0;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

      :deep(.el-card__body) {
        padding: 20px;
      }

      .panel-header {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        font-size: 16px;
        font-weight: 500;
        color: #1d2129;

        .el-icon {
          margin-right: 8px;
          color: #409eff;
        }
      }

      .analysis-form {
        .job-select-btn {
          width: 100%;
          justify-content: space-between;
        }

        .el-form-item {
          margin-bottom: 16px;

          &:last-child {
            margin-bottom: 0;
          }
        }

        .color-scheme-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 4px 0;

          .scheme-label {
            flex: 1;
            color: #4e5969;
          }

          .scheme-preview {
            display: inline-block;
            width: 80px;
            height: 16px;
            border-radius: 3px;
          }
        }

        .apply-btn {
          height: 40px;
          font-size: 14px;
          font-weight: 500;
        }
      }
    }

    .visualization-area {
      flex: 1;
      display: flex;
      flex-direction: column;

      .heatmap-card {
        flex: 1;
        display: flex;
        flex-direction: column;
        border: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

        :deep(.el-card__body) {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: 20px;
        }

        .card-header {
          margin-bottom: 20px;

          .title {
            font-size: 18px;
            font-weight: 500;
            color: #1d2129;
            margin-bottom: 8px;
          }

          .subtitle {
            font-size: 14px;
            color: #666;
          }
        }

        .heatmap-wrapper {
          flex: 1;
          display: flex;
          min-height: 500px;
          width: 100%;
          justify-content: center;
          align-items: center;
          overflow: hidden;

          .heatmap-chart {
            width: 100%;
            height: 100%;
            min-width: 600px;
            min-height: 500px;
            max-height: 700px;
          }
        }

        .stats-container {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #f0f0f0;

          :deep(.el-col) {
            padding: 0 10px;
          }
        }
      }
    }
  }
}

/* 加载提示样式 */
.loading-tip {
  margin: 5px 0 0 0;
  padding: 0;
  color: #666;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 旋转动画效果 */
.rotating-icon {
  animation: rotate 1.5s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .heatmap-container {
    .heatmap-content {
      flex-direction: column;

      .control-panel {
        width: 100%;
        margin-bottom: 20px;
      }

      .visualization-area {
        .heatmap-card {
          .heatmap-wrapper {
            .heatmap-chart {
              min-width: 100%;
              height: 500px;
            }
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .heatmap-container {
    padding: 12px;

    .heatmap-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;

      .action-buttons {
        width: 100%;
        flex-direction: column;

        .el-button {
          width: 100%;
        }
      }
    }

    .heatmap-content {
      .visualization-area {
        .heatmap-card {
          .heatmap-wrapper {
            min-height: 300px;

            .heatmap-chart {
              min-height: 300px;
            }
          }

          .stats-container {
            :deep(.el-row) {
              flex-direction: column;
            }

            :deep(.el-col) {
              width: 100%;
              margin-bottom: 15px;
            }
          }
        }
      }
    }
  }
}
</style>