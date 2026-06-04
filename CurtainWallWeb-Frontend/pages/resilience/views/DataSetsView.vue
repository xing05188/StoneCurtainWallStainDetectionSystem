<template>
  <div class="dataset-container">
    <!-- 标题和操作区 -->
    <div class="dataset-header">
      <h2>数据集管理</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="showUploadDialog" size="large" class="primary-btn">
          <el-icon><upload /></el-icon>
          <span>数据集上传和清洗</span>
        </el-button>
      </div>
    </div>

    <!-- 上传数据集对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传数据集" width="600px" class="custom-dialog">
        <el-upload
            class="dataset-uploader"
            drag
            :action="`${apiUrl}/datasets/upload`"
            multiple
            :limit="1"
            :auto-upload="false"
            :on-change="handleChange"
            :on-success="handleUploadSuccess"
            :before-upload="beforeUpload"
            :file-list="fileList"
            v-loading="uploadingLoading"
        >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
                拖拽文件到此处或 <em>点击上传</em>
            </div>
            <template #tip>
                <div class="el-upload__tip">
                    <p class="upload-tip-general">支持 CSV 格式文件，单文件大小不超过 100MB。</p>
                    <p class="upload-tip-label">必需字段：</p>
                    <div class="upload-tip-list flex-list">
                        <span class="flex-item">batch</span>
                        <span class="flex-item">time</span>
                        <span class="flex-item">system_type</span>
                        <span class="flex-item">area</span>
                        <span class="flex-item">elasticityModulus</span>
                        <span class="flex-item">structuralAdhesiveStress</span>
                        <span class="flex-item">connectorsNumber</span>
                        <span class="flex-item">backBoltsNumber</span>
                        <span class="flex-item">panelSize</span>
                        <span class="flex-item">panelVerticality</span>
                        <span class="flex-item">flatness</span>
                        <span class="flex-item">panelDamageArea</span>
                        <span class="flex-item">cracks</span>
                        <span class="flex-item">stitchingWidth</span>
                        <span class="flex-item">Offset_x</span>
                        <span class="flex-item">Offset_y</span>
                        <span class="flex-item">Offset_z</span>
                        <span class="flex-item">structuralAdhesiveDamageLength</span>
                        <span class="flex-item">stains</span>
                    </div>
                </div>
            </template>
        </el-upload>
        <el-form-item label="数据集名称" prop="name" class="form-item">
            <el-input v-model="datasetName" placeholder="请输入数据集名称" />
        </el-form-item>
        <el-form-item label="数据集描述" prop="description" class="form-item">
            <el-input v-model="datasetDescription" placeholder="请输入数据集描述" />
        </el-form-item>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="uploadDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitUpload">开始上传</el-button>
          </span>
        </template>
    </el-dialog>

    <!-- 数据集列表 -->
    <div class="dataset-list-container">
      <el-card shadow="hover" class="dataset-card">
        <div class="filter-bar">
          <el-input
            v-model="filters.searchQuery"
            placeholder="搜索数据集名称"
            clearable
            style="width: 300px"
            @input="applyFilters"
            @clear="applyFilters"
            @keyup.enter="applyFilters"
          >
            <template #prefix>
              <el-icon><search /></el-icon>
            </template>
          </el-input>
          
          <div class="filter-actions">
            <el-select v-model="filters.sortField" placeholder="排序方式" @change="applyFilters" clearable style="width: 120px;">
              <el-option label="按名称排序" value="name" />
              <el-option label="按创建时间" value="created_at" />
              <el-option label="按文件大小" value="size" />
            </el-select>
            
            <el-button type="info" plain @click="refreshList" class="refresh-btn">
              <el-icon><refresh /></el-icon>
              <span>刷新</span>
            </el-button>
          </div>
        </div>

        <el-table
          :data="datasets"
          style="width: 100%"
          v-loading="loading"
          row-key="id"
          @row-click="handleRowClick"
          class="dataset-table"
        >
          <el-table-column prop="name" label="数据集名称" width="200">
            <template #default="{ row }">
              <div class="dataset-name-cell">
                <el-icon><document /></el-icon>
                <span class="name-text">{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="description" label="数据集描述" width="200" />
          
          <el-table-column prop="size" label="大小" width="120">
            <template #default="{ row }">
              {{ formatFileSize(row.size) }}
            </template>
          </el-table-column>
          
          <el-table-column prop="record_count" label="数据行数" width="120" />
          
          <el-table-column prop="columns" label="特征数量" width="120" />
          
          <el-table-column prop="upload_time" label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.upload_time) }}
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click.stop="showDetail(row)" class="view-btn">
                <el-icon><search /></el-icon>
                <span>查看</span>
              </el-button>
              <el-button size="small" type="danger" @click.stop="handleDelete(row)" class="delete-btn">
                <el-icon><delete /></el-icon>
                <span>删除</span>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
                
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="totalDatasets"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 数据集详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`数据集详情 - ${currentDataset?.name || ''}`"
      width="80%"
      top="5vh"
      destroy-on-close
      class="custom-dialog"
    >
      <div v-if="currentDataset" class="dataset-detail">
        <div class="detail-header">
          <div class="basic-info">
            <div class="info-item">
              <span class="label">文件大小：</span>
              <span class="value">{{ formatFileSize(currentDataset.size) }}</span>
            </div>
            <div class="info-item">
              <span class="label">创建时间：</span>
              <span class="value">{{ formatDateTime(currentDataset.upload_time) }}</span>
            </div>
          </div>
          
          <div class="action-buttons">

              <el-button 
                type="primary" 
                @click="startEditing"
                size="small"
                class="edit-btn"
              >
                <el-icon><edit /></el-icon>
                <span>编辑</span>
              </el-button>
              <el-button 
                type="primary" 
                @click="downloadDataset(currentDataset)"
                size="small"
                class="download-btn"
              >
                <el-icon><download /></el-icon>
                <span>下载</span>
              </el-button>
              <el-button 
                @click="showPreview(currentDataset)"
                size="small"
                class="preview-btn"
              >
                <el-icon><data-line /></el-icon>
                <span>数据预览</span>
              </el-button>


              <el-dialog
                v-model="editDialogVisible"
                title="编辑数据集信息"
                width="500px"
                class="custom-dialog"
              >
                <el-form :model="editForm" label-width="100px" class="form-container">
                  <el-form-item label="数据集名称" required>
                    <el-input 
                      v-model="editForm.name" 
                      placeholder="请输入数据集名称"
                      clearable
                    />
                  </el-form-item>
                  <el-form-item label="数据集描述">
                    <el-input
                      v-model="editForm.description"
                      type="textarea"
                      :rows="4"
                      placeholder="请输入数据集描述"
                    />
                  </el-form-item>
                </el-form>
                <template #footer>
                  <span class="dialog-footer">
                    <el-button @click="editDialogVisible = false">取消</el-button>
                    <el-button 
                      type="primary" 
                      @click="submitEditing"
                      :loading="editingLoading"
                    >
                      保存
                    </el-button>
                  </span>
                </template>
              </el-dialog>

          </div>
        </div>
        
        <el-tabs 
          v-model="activeDetailTab" 
          class="detail-tabs"
          @tab-click="handleTabClick"
        >
          <el-tab-pane label="数据概览" name="overview">
            <div class="statistics-container">
              <el-row :gutter="20">
                <el-col :span="6">
                  <statistic-card title="总行数" :value="currentDataset.record_count" icon="sort" />
                </el-col>
                <el-col :span="6">
                  <statistic-card title="特征数量" :value="currentDataset.columns" icon="set-up" />
                </el-col>
                <el-col :span="6">
                  <statistic-card title="缺失值" :value="currentDataset.missing_values" icon="warning" />
                </el-col>
                <el-col :span="6">
                  <statistic-card title="重复行" :value="currentDataset.duplicates_rows" icon="copy-document" />
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="数据预览" name="preview">
            <div class="data-preview">
              <div class="preview-controls">
                <el-input
                  v-model="previewSearch"
                  placeholder="搜索数据..."
                  clearable
                  style="width: 300px; margin-bottom: 20px"
                  @clear="fetchPreviewData"
                  @keyup.enter="fetchPreviewData"
                >
                  <template #prefix>
                    <el-icon><search /></el-icon>
                  </template>
                </el-input>
              </div>
              
              <el-table
                :data="previewData"
                height="500"
                border
                style="width: 100%"
                v-loading="previewLoading"
                highlight-current-row
              >
                <el-table-column
                  v-for="column in previewColumns"
                  :key="column"
                  :prop="column"
                  :label="column"
                  min-width="150"
                  sortable
                >
                  <template #default="{ row }">
                    {{ formatPreviewValue(row[column]) }}
                  </template>
                </el-table-column>
              </el-table>
              
              <div class="preview-pagination">
                <el-pagination
                  v-model:current-page="previewPage"
                  v-model:page-size="previewPageSize"
                  :page-sizes="[10, 20, 50]"
                  layout="total, sizes, prev, pager, next"
                  :total="currentDataset.record_count"
                  @size-change="fetchPreviewData"
                  @current-change="fetchPreviewData"
                />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Upload,
  UploadFilled,
  Document,
  Search,
  Refresh,
  Download,
  DataLine,
  Edit,
  Delete
} from '@element-plus/icons-vue'
import { formatFileSize, formatDateTime } from '../utils/format'
import ColumnTypeChart from '../components/ColumnTypeChart.vue'
import StatisticCard from '../components/StatisticCard.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiUrl } from '../config'
import axios from 'axios'
import { defineProps, defineEmits} from 'vue'

const props = defineProps({
  modelValue: String,
})
const emit = defineEmits(['dataset-selected'])

// 上传相关
const uploadDialogVisible = ref(false)
const fileList = ref([])
const datasetName = ref()
const datasetDescription = ref()
const uploadingLoading = ref(false)

// 列表相关
const datasets = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const totalDatasets = ref(0)

// 详情相关
const detailDialogVisible = ref(false)
const currentDataset = ref(null)
const activeDetailTab = ref('overview')
const previewData = ref([])
const previewColumns = ref([])
const previewLoading = ref(false)
const previewPage = ref(1)
const previewPageSize = ref(10)
const editDialogVisible = ref(false)
const editingLoading = ref(false)

// 数据预览部分
const previewSearch = ref('')
// 添加格式化预览值的方法
const formatPreviewValue = (value) => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'number') {
    // 保留2位小数
    return Number.isInteger(value) ? value : value.toFixed(2)
  }
  return value
}

// 修改fetchPreviewData方法
const fetchPreviewData = async () => {
  if (!currentDataset.value) return
  
  previewLoading.value = true
  try {
    const params = {
      page: previewPage.value,
      page_size: previewPageSize.value,
      search: previewSearch.value
    }
    
    const response = await axios.get(
      `${apiUrl}/datasets/details/${currentDataset.value.id}/`,
      { params }
    )

    if (response.data.data.data.length > 0) {
      previewData.value = response.data.data.data
      // 从第一条数据提取所有字段作为列
      previewColumns.value = Object.keys(response.data.data.data[0])
        .filter(key => !['id', 'created_at', 'updated_at'].includes(key))
        .sort()
    }
  } catch (error) {
    ElMessage.error('获取预览数据失败')
    console.error('获取预览数据失败:', error)
  } finally {
    previewLoading.value = false
  }
}

// 修改showPreview方法
const showPreview = (dataset) => {
  activeDetailTab.value = 'preview'
  previewPage.value = 1
  previewSearch.value = ''
  fetchPreviewData()
}

// 方法
const showUploadDialog = () => {
  uploadDialogVisible.value = true
}

const beforeUpload = (file: { type: string; name: string; size: number }) => {
  const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv')
  if (!isCSV) {
    ElMessage.error('只能上传CSV格式文件!')
    return false
  }
  
  const isLt100M = file.size / 1024 / 1024 < 100
  if (!isLt100M) {
    ElMessage.error('文件大小不能超过100MB!')
    return false
  }
  
  return true
}

// 处理文件选中
const handleChange = (file: any, files: never[]) => {
  fileList.value = files; // 更新 fileList
};

const handleUploadSuccess = (response: any, file: { name: any }) => {
  console.log('上传成功')
  ElMessage.success(`${file.name} 上传成功`)
  fetchDatasets()
  uploadDialogVisible.value = false
}

// 手动上传
const submitUpload = async () => {
  if (fileList.value.length === 0) {
    ElMessage.warning("请先选择文件！");
    return;
  }

  if (!datasetName.value.trim()) {
    ElMessage.warning("数据集名称不能为空！");
    return;
  }

  const formData = new FormData();
  formData.append("name", datasetName.value);
  formData.append("description", datasetDescription.value || '');

  // 遍历 fileList 添加文件
  fileList.value.forEach((file) => {
    formData.append("files", file.raw);
  });

  try {
    uploadingLoading.value = true;
    const response = await axios.post(`${apiUrl}/datasets/upload/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
    if (response.status === 201) {
      ElMessage.success("上传成功！");
      uploadDialogVisible.value = false; // 关闭对话框
      fileList.value = []; // 清空文件列表
      datasetName.value = "";
      datasetDescription.value = "";
    } else {
      ElMessage.error(`上传失败，状态码: ${response.status}`);
    }
  } catch (error) {
    let errorMessage = "上传失败！";
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    ElMessage.error(errorMessage);
  } finally {
    uploadingLoading.value = false;
  }
};

// 数据状态
const filters = ref({
  searchQuery: '',
  sortField: 'created_at',
  sortOrder: 'desc'
})

// 应用筛选条件
const applyFilters = () => {
  currentPage.value = 1
  fetchDatasets()
}

// 获取数据集列表
const fetchDatasets = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      page_size: pageSize.value,
      search: filters.value.searchQuery,
      ordering: filters.value.sortField ? 
        `${filters.value.sortOrder === 'desc' ? '-' : ''}${filters.value.sortField}` : ''
    }
    
    const response = await axios.get(`${apiUrl}/datasets/list/`, { params })
    datasets.value = response.data.data.results
    totalDatasets.value = response.data.data.count
  } catch (error) {
    ElMessage.error('获取数据集列表失败')
  } finally {
    loading.value = false
  }
}

const refreshList = () => {
  currentPage.value = 1
  fetchDatasets()
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  fetchDatasets()
}

const handlePageChange = (val: number) => {
  currentPage.value = val
  fetchDatasets()
}

const handleRowClick = (row: any) => {
  showDetail(row)
}

const showDetail = async (dataset: any) => {
  emit('dataset-selected', dataset)
  try {
    console.log('showDetail', dataset)
    await fetchDatasetDetail(dataset.id)
    detailDialogVisible.value = true
    activeDetailTab.value = 'overview'
  } catch (error) {
    ElMessage.error('获取数据集详情失败')
  }
}

const fetchDatasetDetail = async (datasetId: number) => {
  try {
    const response = await axios.get(`${apiUrl}/datasets/${datasetId}/`)
    currentDataset.value = response.data.data
  } catch (error) {
    if (error.response) {
      ElMessage.error(`获取数据集详情失败，状态码: ${error.response.status}`)
    } else if (error.request) {
      ElMessage.error("请求超时或服务器未响应，请稍后再试！")
    } else {
      ElMessage.error("请求配置错误，请检查代码！")
    }
    console.error(error)
    throw error
  }
}

const handleDelete = (dataset: { name: any; id: any }) => {
  ElMessageBox.confirm(
    `确定要删除数据集 "${dataset.name}" 吗? 此操作不可恢复。`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await deleteDataset(dataset.id)
      ElMessage.success('删除成功')
      fetchDatasets()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const getDatasets = async (page: number, pageSize: number) => {
  try {
    const params = {
      page: page,
      page_size: pageSize
    };

    const response = await axios.get(`${apiUrl}/datasets/list/`, {
      params: params
    });
    // ElMessage.success(`获取数据集列表成功`);
    return response.data;
  } catch (error) {
    if (error) {
      if (error.response) {
        ElMessage.error(`获取数据集列表失败，状态码: ${error.response.status}`);
      } else if (error.request) {
        // 请求已发出，但没有收到响应
        ElMessage.error("请求超时或服务器未响应，请稍后再试！");
      } else {
        // 一些设置请求时发生错误
        ElMessage.error("请求配置错误，请检查代码！");
      }
    } else {
      // 非 Axios 错误
      ElMessage.error("未知错误，请检查日志！");
    }
    console.error(error);
    loading.value = false
    throw error; // 重新抛出错误以便上层处理
  }
}

const deleteDataset = (id: any) => {
  return axios.delete(`${apiUrl}/datasets/${id}/`)
}

const isEditing = ref(false)
const editForm = ref({
  name: '',
  description: ''
})

// 添加以下方法
const startEditing = () => {
  isEditing.value = true
  editForm.value = {
    name: currentDataset.value.name,
    description: currentDataset.value.description || ''
  }
  editDialogVisible.value = true
}

const handleTabClick = (tab) => {
  if (tab.paneName === 'preview') {
    fetchPreviewData()
  }
}
const cancelEditing = () => {
  isEditing.value = false
  editDialogVisible.value = false
}

const submitEditing = async () => {
  try {
    const response = await axios.post(
      `${apiUrl}/datasets/details/${currentDataset.value.id}/`,
      editForm.value
    )
    
    if (response.status === 200) {
      ElMessage.success('修改成功')
      currentDataset.value.name = editForm.value.name
      currentDataset.value.description = editForm.value.description
      fetchDatasets() // 刷新列表
      isEditing.value = false
    }
  } catch (error) {
    let errorMessage = '修改失败'
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    }
    ElMessage.error(errorMessage)
  }
}

const downloadDataset = async (dataset) => {
  try {
    const response = await axios({
      url: `${apiUrl}/datasets/${dataset.id}/download/`,
      method: 'GET',
      responseType: 'blob', // 重要：指定响应类型为blob
    })
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${dataset.name}.csv`) // 设置下载文件名
    document.body.appendChild(link)
    link.click()
    
    // 清理
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('下载开始')
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败: ' + (error.response?.data?.message || error.message))
  }
}

// 生命周期
onMounted(() => {
  fetchDatasets()
})
</script>

<style scoped lang="scss">
.dataset-container {
  padding: 16px;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  background-color: #f9fafb;

  .dataset-header {
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

      .primary-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
    }
  }

  .dataset-uploader {
    :deep(.el-upload) {
      width: 100%;
    }

    :deep(.el-upload-dragger) {
      width: 100%;
      padding: 40px 20px;
      border-radius: 8px;
      background-color: #fafafa;
      margin-bottom: 20px;

      .el-icon--upload {
        font-size: 60px;
        color: #409eff;
        margin-bottom: 16px;
      }

      .el-upload__text {
        font-size: 16px;
        color: #666;
      }
    }

    .el-upload__tip {
      margin-top: 10px;
      color: #999;
      text-align: left;
      padding: 10px;
      background-color: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 4px;
    }

    .upload-tip-general {
      margin-bottom: 10px;
    }

    .upload-tip-label {
      font-weight: bold;
      margin-bottom: 5px;
    }

    .flex-list {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-start;
    }

    .flex-item {
      margin-right: 10px;
      margin-bottom: 5px;
      padding: 5px 10px;
      border: 1px solid #eee;
      border-radius: 4px;
      background-color: #fff;
      font-size: 12px;
    }

    .form-item {
      margin-top: 16px;
    }
  }

  .dataset-list-container {
    flex: 1;

    .dataset-card {
      height: 100%;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border-radius: 8px;

      :deep(.el-card__body) {
        padding: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .filter-bar {
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #eee;
        flex-wrap: wrap;
        gap: 15px;

        .el-input {
          width: 300px;

          &:deep(.el-input__wrapper) {
            border-radius: 4px;
          }
        }

        .filter-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;

          .el-select {
            width: 120px;

            &:deep(.el-select__wrapper) {
              border-radius: 4px;
            }
          }

          .refresh-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 0 12px;
          }
        }
      }

      .dataset-table {
        flex: 1;

        :deep(.el-table) {
          width: 100%;
          border-collapse: collapse;
        }

        :deep(.el-table__header-wrapper) {
          background-color: #f5f7fa;
        }

        :deep(.el-table__header tr th) {
          background-color: #f5f7fa;
          color: #4e5969;
          font-weight: 500;
          border-bottom: 1px solid #eee;
        }

        :deep(.el-table__body tr td) {
          border-bottom: 1px solid #f0f0f0;
        }

        :deep(.el-table__body tr:hover > td) {
          background-color: #f5f7fa;
          cursor: pointer;
        }

        :deep(.dataset-name-cell) {
          display: flex;
          align-items: center;

          .el-icon {
            margin-right: 8px;
            color: #409eff;
          }

          .name-text {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        :deep(.view-btn) {
          color: #409eff;
          border-color: #409eff;
          background-color: #ecf5ff;
          margin-right: 5px;

          &:hover {
            background-color: #e6f2ff;
            color: #3a8ee6;
            border-color: #3a8ee6;
          }
        }

        :deep(.delete-btn) {
          &:hover {
            opacity: 0.9;
          }
        }
      }

      .pagination-container      .pagination-container {
        padding: 16px;
        display: flex;
        justify-content: flex-end;
        border-top: 1px solid #eee;

        :deep(.el-pagination) {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        :deep(.el-pagination__sizes) {
          margin-right: 10px;
        }
      }
    }
  }

  .dataset-detail {
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
      flex-wrap: wrap;
      gap: 15px;

      .basic-info {
        display: flex;
        gap: 30px;
        flex-wrap: wrap;

        .info-item {
          .label {
            color: #666;
            font-size: 14px;
          }

          .value {
            font-weight: 500;
          }
        }
      }

      .action-buttons {
        display: flex;
        gap: 10px;

        .edit-btn, .download-btn, .preview-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
      }
    }

    .detail-tabs {
      :deep(.el-tabs__header) {
        margin: 0 0 16px 0;
        border-bottom: 1px solid #eee;
      }

      .statistics-container {
        margin-bottom: 30px;
      }

      .column-types {
        margin-top: 30px;

        h3 {
          margin: 0 0 20px 0;
          font-size: 16px;
          color: #333;
        }
      }

      .data-preview {
        .preview-pagination {
          margin-top: 15px;
          display: flex;
          justify-content: flex-end;
        }
      }
    }
  }
}

/* 对话框样式 */
.custom-dialog {
  border-radius: 8px;
  overflow: hidden;

  :deep(.el-dialog__header) {
    padding: 18px 20px;
    border-bottom: 1px solid #eee;
  }

  :deep(.el-dialog__title) {
    font-size: 16px;
    font-weight: 500;
    color: #1d2129;
  }

  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
  }

  :deep(.el-dialog__footer) {
    padding: 16px 20px;
    border-top: 1px solid #eee;
  }

  :deep(.dialog-footer) {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  :deep(.el-button) {
    margin-left: 0;
  }
}

.form-container {
  :deep(.el-form) {
    width: 100%;
  }

  :deep(.el-form-item) {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(.el-form-item__label) {
    color: #4e5969;
    font-weight: 500;
  }

  :deep(.el-input),
  :deep(.el-select),
  :deep(.el-input-number) {
    width: 100%;
  }
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .dataset-container {
    .dataset-list-container {
      .dataset-card {
        .filter-bar {
          flex-direction: column;
          align-items: flex-start;

          .el-input {
            width: 100% !important;
          }

          .filter-actions {
            width: 100%;
            justify-content: flex-start;
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .dataset-container {
    padding: 12px;

    .dataset-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;

      .action-buttons {
        width: 100%;

        .primary-btn {
          width: 100%;
          justify-content: center;
        }
      }
    }

    .dataset-list-container {
      .dataset-card {
        .filter-bar {
          .filter-actions {
            flex-direction: column;
            width: 100%;
            gap: 8px;

            .el-select {
              width: 100% !important;
            }

            .refresh-btn {
              width: 100%;
              justify-content: center;
            }
          }
        }

        .dataset-table {
          :deep(.el-table__fixed-right) {
            width: 120px !important;
          }

          :deep(.el-button) {
            padding: 0 8px;
            font-size: 12px;

            .el-icon {
              font-size: 14px;
            }

            span {
              display: none;
            }
          }
        }
      }
    }
  }

  .custom-dialog {
    width: 90% !important;
  }

  .dataset-detail {
    .detail-header {
      flex-direction: column;
      align-items: flex-start;

      .action-buttons {
        width: 100%;
        flex-wrap: wrap;
      }
    }
  }
}
</style>