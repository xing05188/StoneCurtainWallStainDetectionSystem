<template>
  <div class="radar-container">
    <!-- 标题和操作区 -->
    <div class="radar-header">
      <h2>幕墙韧性各维度雷达图分析</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="fetchData" :loading="loading">
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
    <div class="radar-content">
      <el-card shadow="hover" class="control-panel">
        <div class="panel-header">
          <el-icon><setting /></el-icon>
          <span>分析参数配置</span>
        </div>
        
        <el-form label-width="100px" label-position="left" class="analysis-form">
          <el-form-item label="选择分析任务" prop="job_id">
            <div class="job-select-wrapper">
              <el-button type="primary" @click="showJobDialog" class="job-select-btn">
                <el-icon v-if="selectedJob == null"><plus /></el-icon>
                <span>{{ selectedJob == null ? '选择分析任务': `【${selectedJob.job_name}】`}}</span>
              </el-button>
              <div class="job-info" v-if="selectedJob">
                <el-tag type="info" size="small">{{ formatDateTime(selectedJob.finished_at) }}</el-tag>
              </div>
            </div>

            <el-dialog
              title="选择分析任务"
              v-model="jobDialogVisible"
              :width="dialogWidth"
            >
              <JobsView 
                v-if="jobDialogVisible" 
                @job-selected="handleJobSelected" 
                key="job-selector"
                :filter-condition="jobFilterCondition"
              />
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
          
          <el-form-item label="显示选项">
            <div class="display-options">
              <el-checkbox v-model="showValue">显示数值</el-checkbox>
              <el-checkbox v-model="showAverage">显示平均线</el-checkbox>
              <el-checkbox v-model="showArea">显示填充区域</el-checkbox>
            </div>
          </el-form-item>
          
          <el-form-item label="半径设置">
            <el-slider v-model="radius" :min="50" :max="100" :step="5" show-input />
          </el-form-item>
          
          <el-form-item>
            <el-button 
              type="primary" 
              @click="fetchData" 
              style="width: 100%"
              :disabled="!selectedJob"
              class="apply-btn"
            >
              生成雷达图
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
      
      <!-- 雷达图绘制区 -->
      <div class="visualization-area">
        <el-card shadow="hover" class="radar-card">
          <div class="card-header">
            <div class="title">幕墙韧性雷达图</div>
            <div class="subtitle" v-if="selectedJob">
              当前任务: {{ selectedJob.job_name }} | 
              更新时间: {{ formatDateTime(selectedJob.finished_at) }}
            </div>
          </div>
          <el-empty
            description="请先选择一个分析任务以查看雷达图结果"
            :image-size="120"
            v-if="!selectedJob"
          />
          <div class="chart-container">
            <div 
              ref="radarChart" 
              style="width: 100%; height: 500px;"
              v-loading="loading"
            ></div>
          </div>
          
          <div class="legend-container" v-if="chartData.series?.length > 0">
            <div class="legend-title">图例说明：</div>
            <div class="legend-items">
              <div 
                class="legend-item" 
                v-for="item in chartData.series" 
                :key="item.name"
              >
                <span 
                  class="legend-color" 
                  :style="`background-color: ${item.itemStyle?.color || '#999'}`"
                ></span>
                <span class="legend-label">{{ item.name }}</span>
                <span class="legend-value" v-if="showValue">
                  ({{ calculateAverage(item.value).toFixed(2) }})
                </span>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { Refresh, Download, Setting, Plus } from '@element-plus/icons-vue'
import JobsView from '../views/AnalysisJobView.vue'
import { formatDateTime } from '../utils/format'
import { apiUrl } from '../config'
import axios from 'axios'

// 图表相关
const radarChart = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null
const loading = ref(false)

// 显示选项
const showValue = ref(true)
const showAverage = ref(true)
const showArea = ref(true)
const radius = ref(80)

// 颜色方案
const colorScheme = ref('vivid')
const colorSchemes = [
  { value: 'vivid', label: '鲜艳', preview: 'linear-gradient(to right, #c23531, #2f4554, #61a0a8, #d48265, #91c7ae)' },
  { value: 'cool', label: '冷色', preview: 'linear-gradient(to right, #003f5c, #2f4b7c, #665191, #a05195, #d45087)' },
  { value: 'warm', label: '暖色', preview: 'linear-gradient(to right, #ff7c43, #ffa600, #f95d6a, #d45087, #a05195)' },
]

// 任务选择
const selectedJob = ref<any>(null)
const selectedJobID = ref<string | null>(null)
const jobDialogVisible = ref(false)

// 响应式对话框宽度
const dialogWidth = computed(() => {
  const screenWidth = window.innerWidth;
  return screenWidth > 1600 ? '80%' : screenWidth > 1200 ? '70%' : '90%';
});

// 任务筛选条件 - 只显示选择了全部维度的任务
const jobFilterCondition = computed(() => {
  return (job: any) => {
    return job.status === 'completed' && 
           job.dimension && 
           job.dimension.includes('overall') &&
           job.dimension.length >= 5 // 假设至少需要5个维度才算"全部"
  }
})

// 图表数据
interface ChartSeriesItem {
  name: string;
  value: number[];
  itemStyle?: {
    color?: string;
  };
  lineStyle?: {
    type?: string;
  };
}

interface ChartData {
  dimensions: string[];
  series: ChartSeriesItem[];
}

const chartData = ref<ChartData>({
  dimensions: [],
  series: []
})

// 初始化图表
const initChart = () => {
  if (!radarChart.value) return
  
  chartInstance = echarts.init(radarChart.value)
  updateChart()
}

// 计算平均值
const calculateAverage = (values: number[]) => {
  if (!values || !values.length) return 0
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

// 更新图表
const updateChart = () => {
  if (!chartInstance || !chartData.value.dimensions.length) return
  
  const colors = colorSchemes.find(s => s.value === colorScheme.value)?.preview.match(/#[0-9a-fA-F]{6}/g) || ['#c23531']
  
  const option = {
    title: {
      text: '幕墙韧性多维分析',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        let tip = `<strong>${params.seriesName}</strong><br/>`
        params.data.value.forEach((val: number, idx: number) => {
          tip += `${chartData.value.dimensions[idx]}: ${val?.toFixed?.(2) || '0.00'}<br/>`
        })
        return tip
      }
    },
    legend: {
      data: chartData.value.series.map(item => item.name),
      bottom: 10,
      itemWidth: 20,
      itemHeight: 10
    },
    radar: {
      radius: `${radius.value}%`,
      indicator: chartData.value.dimensions.map(name => ({ 
        name, 
        max: 1,
        color: '#666'
      })),
      splitNumber: 4,
      axisName: {
        color: '#333',
        fontSize: 12
      },
      splitArea: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    series: [{
      type: 'radar',
      data: chartData.value.series.map((series, idx) => ({
        ...series,
        itemStyle: {
          color: colors[idx % colors.length]
        },
        label: {
          show: showValue.value,
          formatter: (params: any) => {
            return params.value?.toFixed?.(2) || '0.00'
          }
        },
        areaStyle: showArea.value ? {
          opacity: 0.2
        } : undefined,
        lineStyle: {
          width: series.name === '平均线' ? 2 : 3,
          type: series.name === '平均线' ? 'dashed' : 'solid'
        },
        symbolSize: 6
      }))
    }],
    color: colors
  }
  
  chartInstance.setOption(option, true)
}

// 获取雷达图数据
const getRadarData = async () => {
  try {
    const response = await axios.get(`${apiUrl}/visualization/radar/${selectedJobID.value}`)
    return response.data.data
  } catch (error) {
    ElMessage.error('获取雷达数据失败')
    console.error(error)
    throw error
  }
}

// 获取数据
const fetchData = async () => {
  if (!selectedJob.value) {
    ElMessage.warning('请先选择分析任务');
    return;
  }

  try {
    loading.value = true;
    
    // 获取API数据
    const response = await axios.get(`${apiUrl}/visualization/radar/${selectedJob.value.id}`);
    const radarData = response.data.data;
    
    // 准备图表数据
    const dimensions = radarData.dimensions;
    const seriesData = [];
    
    // 处理每个批次的分数
    for (const [batchId, scores] of Object.entries(radarData.scores)) {
      seriesData.push({
        name: `批次 ${batchId}`,
        value: scores,
        itemStyle: {
          color: getColorForBatch(batchId)
        }
      });
    }
    
    // 如果需要显示平均线
    if (showAverage.value) {
      const avgValues = dimensions.map((dim: string) => {
        const validScores = Object.values(radarData.scores)
          .map((batchScores: number[]) => batchScores[dimensions.indexOf(dim)])
          .filter(score => !isNaN(score));
        
        return validScores.length > 0 
          ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
          : 0;
      });
      
      seriesData.push({
        name: '平均线',
        value: avgValues,
        lineStyle: {
          type: 'dashed'
        },
        itemStyle: {
          color: '#666'
        }
      });
    }

    // 计算各维度平均值和标准差
    const dimStats = dimensions.map(dim => {
        const values = Object.values(radarData.scores)
          .map(batchScores => batchScores[dimensions.indexOf(dim)])
          .filter(score => !isNaN(score));
        
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length);
        
        return { avg, std };
      });

      // 准备图表数据
      chartData.value = {
        dimensions: dimensions,
        series: [
          {
            name: '平均值',
            value: dimStats.map(d => d.avg),
            itemStyle: { color: '#1890FF' },
            lineStyle: { width: 3 }
          },
          {
            name: '平均值+标准差',
            value: dimStats.map(d => Math.min(1, d.avg + d.std)), // 不超过1
            itemStyle: { color: '#91D5FF' },
            lineStyle: { type: 'dashed', width: 1 }
          },
          {
            name: '平均值-标准差',
            value: dimStats.map(d => Math.max(0, d.avg - d.std)), // 不小于0
            itemStyle: { color: '#91D5FF' },
            lineStyle: { type: 'dashed', width: 1 }
          }
        ]
      };
    updateChart();
  } catch (error) {
    ElMessage.error('获取雷达数据失败');
    console.error('处理数据失败:', error);
  } finally {
    loading.value = false;
  }
};

// 辅助函数：为不同批次生成颜色
const getColorForBatch = (batchId: string) => {
  const colors = [
    '#c23531', '#2f4554', '#61a0a8', '#d48265', '#91c7ae',
    '#749f83', '#ca8622', '#bda29a', '#6e7074', '#546570'
  ];
  const index = parseInt(batchId) % colors.length;
  return colors[index];
};

// 处理任务选择
const handleJobSelected = (job: any) => {
  if (!job) return

  // 验证任务维度
  if (!job.dimension || 
      !['overall', 'structural', 'geometric', 'damage', 'visual'].every(dim => 
          job.dimension.includes(dim)
      )
  ) {
      ElMessage.warning('请选择包含全部维度(overall/structural/geometric/damage/visual)的分析任务')
      return
  }
  if (job.status !== 'completed') {
    ElMessage.warning('请选择已完成的分析任务')
    return
  }

  selectedJob.value = job
  selectedJobID.value = job.id
  jobDialogVisible.value = false
  fetchData()
}

// 显示任务选择对话框
const showJobDialog = () => {
  jobDialogVisible.value = true
}

// 导出图片
const exportImage = async () => {
  if (!chartInstance) {
    ElMessage.warning('请先生成雷达图')
    return
  }

  if (!selectedJob.value?.id) {
    ElMessage.error('请先选择关联的分析任务')
    return
  }

  const loading = ElMessage.info('正在处理图片...')

  try {
    const url = chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff'
    })

    const blob = await fetch(url).then(res => res.blob())
    const fileName = `radarmap_${selectedJob.value.id}_${Date.now()}.png`
    const file = new File([blob], fileName, { type: 'image/png' })

    const formData = new FormData()
    formData.append('job_id', selectedJob.value.id)
    formData.append('radar', file)

    await Promise.all([
      new Promise<void>((resolve) => {
        const link = document.createElement('a')
        link.href = url
        link.download = `雷达图_${selectedJob.value.name || '未命名'}_${formatDateTime(new Date())}.png`
        document.body.appendChild(link)
        link.click()
        setTimeout(() => {
          document.body.removeChild(link)
          resolve()
        }, 100)
      }),
      
      axios.post(`${apiUrl}/visualization/upload/radar/${selectedJob.value.id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      })
    ])

    ElMessage.success({
      message: `雷达图保存成功！`,
      duration: 5000
    })
    
  } catch (error) {
    console.error('导出/上传失败:', error)
    
    let errorMessage = '操作失败'
    if (error.response) {
      errorMessage = `服务器错误: ${error.response.data.error || error.response.statusText}`
    } else if (error.request) {
      errorMessage = '网络连接异常，请检查网络'
    }

    ElMessage.error({
      message: errorMessage,
      duration: 5000
    })
    
  } finally {
    loading.close()
  }
}

// 窗口大小变化时重新调整图表大小
const handleResize = () => {
  chartInstance?.resize()
}

// 组件挂载时初始化图表
onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

// 监听相关变化
watch([colorScheme, showValue, showAverage, showArea, radius], () => {
  updateChart()
})

// 组件卸载时清理
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped lang="scss">
.radar-container {
  padding: 16px;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  background-color: #f9fafb;

  .radar-header {
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

  .radar-content {
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
        .job-select-wrapper {
          width: 100%;
          position: relative;

          .job-info {
            margin-top: 8px;
          }
        }

        .job-select-btn {
          width: 100%;
          justify-content: space-between;
        }

        .display-options {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-top: 8px;

          :deep(.el-checkbox) {
            color: #4e5969;
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

        .el-form-item {
          margin-bottom: 16px;

          &:last-child {
            margin-bottom: 0;
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

      .radar-card {
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

        .chart-container {
          flex: 1;
          width: 100%;
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .legend-container {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #f0f0f0;

          .legend-title {
            font-weight: 500;
            color: #4e5969;
            margin-bottom: 10px;
            font-size: 14px;
          }

          .legend-items {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;

            .legend-item {
              display: flex;
              align-items: center;
              gap: 8px;
              color: #4e5969;
              font-size: 13px;

              .legend-color {
                display: inline-block;
                width: 15px;
                height: 15px;
                border-radius: 3px;
              }

              .legend-value {
                color: #666;
              }
            }
          }
        }
      }
    }
  }
}

// 响应式适配
@media (max-width: 1200px) {
  .radar-container {
    .radar-content {
      flex-direction: column;

      .control-panel {
        width: 100%;
        margin-bottom: 20px;
      }

      .visualization-area {
        .radar-card {
          .chart-container {
            min-height: 400px;
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .radar-container {
    padding: 12px;

    .radar-header {
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

    .radar-content {
      .visualization-area {
        .radar-card {
          .chart-container {
            min-height: 300px;
          }

          .legend-container {
            .legend-items {
              flex-direction: column;
              gap: 10px;

              .legend-item {
                width: 100%;
              }
            }
          }
        }
      }
    }
  }
}
</style>