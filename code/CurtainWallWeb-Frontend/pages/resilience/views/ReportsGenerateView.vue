<template>
  <div class="report-generation-container">
    <!-- 标题和操作区 -->
    <div class="report-header">
      <h2>报告生成</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="showJobDialog" size="large" :loading="isLoading">
          <el-icon v-if="selectedJob == null"><plus /></el-icon>
          <span>{{ selectedJob == null ? '选择分析任务': `【${selectedJob.job_name}】`}}</span>
        </el-button>
        <el-button type="primary" @click="handleGenerateReport" size="large" :loading="isLoading" class="generate-btn">
          <el-icon><document /></el-icon>
          <span>生成报告</span>
        </el-button>
      </div>
    </div>

    <!-- 分析任务选择 -->
    <div class="task-selection">
      <el-dialog
        title="选择分析任务"
        v-model="jobDialogVisible"
        :width="dialogWidth"
      >
        <JobsView @job-selected="handleJobSelected" />
      </el-dialog>
    </div>

    <!-- 报告预览 -->
    <el-card class="report-card">
      <div class="report-preview">
        <div v-if="generatedReport" class="preview-content">
          <div class="preview-header">
            <h3>报告预览</h3>
            <el-button 
              type="text" 
              @click="openNewWindow"
              class="open-new-btn"
            >
              <el-icon><Expand /></el-icon> 新窗口打开
            </el-button>
          </div>
          <div class="preview-wrapper">
            <iframe :src="generatedReport" class="report-iframe" />
          </div>
        </div>
        <div v-else class="placeholder">
          <el-empty description="请先选择分析任务并生成报告" />
        </div>
      </div>
    </el-card>

    <!-- 生成报告确认对话框 -->
    <el-dialog
      v-model="confirmDialogVisible"
      title="生成报告确认"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="report-confirm-content">
        <h4>当前分析任务包含以下内容：</h4>

        <div class="confirm-section">
          <h5>分析维度</h5>
          <ul class="check-list">
            <li v-for="item in reportChecklist.dimensions" :key="item.name">
              <span>{{ item.name }}</span>
              <el-icon :color="item.has ? '#67C23A' : '#F56C6C'">
                <component :is="item.has ? 'Check' : 'Close'" />
              </el-icon>
            </li>
          </ul>
        </div>

        <div class="confirm-section">
          <h5>可视化图表</h5>
          <ul class="check-list">
            <li v-for="item in reportChecklist.visualizations" :key="item.name">
              <span>{{ item.name }}</span>
              <span>已生成{{ item.completed }}份</span>
            </li>
          </ul>
        </div>

        <div class="confirm-tips">
          <el-alert type="info" :closable="false">
            提示：标记为 <el-icon color="#67C23A"><Check /></el-icon> 的项目将被包含在报告中，
            标记为 <el-icon color="#F56C6C"><Close /></el-icon> 的项目将不会出现在报告中。
            维度分析请另开任务，可视化图表可以生成后上传即可。
          </el-alert>
        </div>
      </div>
      <template #footer>
        <el-button @click="confirmDialogVisible = false" :disabled="isGenerating">取消</el-button>
        <el-button type="primary" @click="confirmGenerateReport" :loading="isGenerating">
          <span v-if="!isGenerating">确认生成</span>
          <span v-if="isGenerating">生成中...</span>
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { ElMessage, ElLoading } from 'element-plus';
import { Document, Plus, Check, Close, Expand } from '@element-plus/icons-vue';
import JobsView from '../views/AnalysisJobView.vue'
import axios from 'axios';
import { apiUrl } from '../config';

// 生成报告相关
const generatedReport = ref(null);
const confirmDialogVisible = ref(false);
const reportChecklist = ref({
  dimensions: [],
  visualizations: []
});

// 加载状态变量
const isLoading = ref(false);
const isGenerating = ref(false);
const generateLoadingInstance = ref(null);

const jobDialogVisible = ref(false);
const selectedJob = ref(null);
const selectedJobID = ref(null);
const job_id = ref(null)

// 响应式对话框宽度
const dialogWidth = computed(() => {
  const screenWidth = window.innerWidth;
  // 根据屏幕宽度动态调整对话框宽度
  return screenWidth > 1600 ? '80%' : screenWidth > 1200 ? '70%' : '90%';
});

function handleJobSelected(row: { id: string; job_name: any } | null) {
  selectedJob.value = row
  console.log('选中的任务：', row)
  if(row) {
    job_id.value = row.id
    selectedJobID.value = row.id
  }
  jobDialogVisible.value = false
}

const showJobDialog = () => {
  jobDialogVisible.value = true
}

const handleGenerateReport = async () => {
  if (!selectedJob.value) {
    ElMessage.warning('请选择分析任务');
    return;
  }
  
  isLoading.value = true;
  try {
    // 显示加载框
    const loading = ElLoading.service({
      lock: true,
      text: '正在获取报告内容清单...',
      background: 'rgba(0, 0, 0, 0.7)',
    });

    // 请求接口，设置超时时间为10秒
    const response = await axios.get(`${apiUrl}/reports/${selectedJobID.value}/checklist/`, {
      timeout: 10000,
    });
    console.log(response.data.data)
    reportChecklist.value = response.data.data;
    confirmDialogVisible.value = true;

  } catch (error) {
    let errorMessage = "生成报告信息获取失败！";
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    ElMessage.error(errorMessage);

  } finally {
    isLoading.value = false;
    ElLoading.service().close(); // 关闭加载框
  }
};

const confirmGenerateReport = async () => {
  confirmDialogVisible.value = false;
  
  // 显示全局加载状态
  generateLoadingInstance.value = ElLoading.service({
    lock: true,
    text: '报告生成中，请稍候...',
    background: 'rgba(0, 0, 0, 0.7)',
  });
  
  isGenerating.value = true;
  
  try {
    const res = await generateReportApi();
    generatedReport.value = res.data;
    ElMessage.success('报告生成成功');
  } catch (error) {
    console.error('报告生成失败');
    ElMessage.error('报告生成失败，请稍后重试');
  } finally {
    isGenerating.value = false;
    // 关闭全局加载状态
    if (generateLoadingInstance.value) {
      generateLoadingInstance.value.close();
    }
  }
};

// 新窗口打开报告
const openNewWindow = () => {
  if (generatedReport.value) {
    window.open(generatedReport.value);
  }
};

const reportDetails = ref(null)
const generateReportApi = async () => {
  try {
    const response = await axios.post(`${apiUrl}/reports/generate/`, {
      job_id: selectedJobID.value,
    });

    reportDetails.value = response.data;

    // 获取 PDF Blob
    const responsePreview = await axios.get(
      `${apiUrl}/reports/${selectedJobID.value}/download/`,
      { responseType: 'blob' }
    );

    // 创建 blob URL 用于预览
    const fileURL = URL.createObjectURL(new Blob([responsePreview.data], { type: 'application/pdf' }));

    // 在新窗口预览 PDF
    window.open(fileURL);

    // 绑定 URL 到组件状态中用于 iframe 预览
    generatedReport.value = fileURL;

    return { data: fileURL };

  } catch (error) {
    const errorMessage = error.response?.data?.message || '报告生成失败，请稍后重试';
    throw new Error(errorMessage);
  }
};
</script>


<style scoped lang="scss">
.report-generation-container {
  padding: 16px;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  background-color: #f9fafb;

  .report-header {
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

      .generate-btn {
        background-color: #409eff;
        &:hover {
          background-color: #66b1ff;
        }
      }
    }
  }

  .task-selection {
    margin-bottom: 16px;
  }

  .report-card {
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border-radius: 8px;
    overflow: hidden;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .report-preview {
    width: 100%;
    min-height: 500px;
    display: flex;
    flex-direction: column;

    .preview-content {
      flex: 1;
      display: flex;
      flex-direction: column;

      .preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #f0f0f0;

        h3 {
          font-size: 16px;
          color: #1d2129;
          margin: 0;
          font-weight: 500;
        }

        .open-new-btn {
          color: #409eff;
          padding: 4px 0;
          display: flex;
          align-items: center;
          gap: 4px;

          &:hover {
            color: #66b1ff;
            background-color: transparent;
          }
        }
      }

      .preview-wrapper {
        flex: 1;
        position: relative;
        min-height: 400px;
        border: 1px solid #e5e6eb;
        border-radius: 4px;
        overflow: hidden;

        .report-iframe {
          width: 100%;
          height: 100%;
          min-height: 400px;
          border: none;
        }
      }
    }

    .placeholder {
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 1;
      color: #86909c;
      padding: 40px 20px;
    }
  }

  .report-confirm-content {
    h4 {
      margin-bottom: 16px;
      color: #1d2129;
      font-size: 16px;
      font-weight: 500;
    }

    .confirm-section {
      margin-bottom: 16px;

      h5 {
        margin-bottom: 8px;
        color: #4e5969;
        font-size: 14px;
        font-weight: 500;
      }
    }

    .check-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 8px;

      li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background-color: #f7f8fa;
        border-radius: 4px;
        font-size: 14px;

        span {
          flex: 1;
          color: #4e5969;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .el-icon {
          margin-left: 8px;
          flex-shrink: 0;
        }
      }
    }

    .confirm-tips {
      margin-top: 16px;
    }
  }
}

// 响应式调整
@media (max-width: 768px) {
  .report-generation-container {
    padding: 12px;

    .report-header {
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

    .report-confirm-content {
      .check-list {
        grid-template-columns: 1fr;
      }
    }
  }
}
</style>