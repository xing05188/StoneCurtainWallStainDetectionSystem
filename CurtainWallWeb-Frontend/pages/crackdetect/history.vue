<template>
  <div class="container">
    <div class="header">
      <h2>项目历史记录</h2>
      <el-button type="primary" @click="$router.push('/crackdetect')" class="new-project-btn">
        新建项目
      </el-button>
    </div>

    <div class="projects-grid">
      <el-card 
        v-for="project in projects" 
        :key="project.project_id" 
        class="project-card"
        shadow="hover"
      >
        <div class="project-header">
          <h3>{{ project.project_name }}</h3>
          <el-tag size="small" :type="getStatusType(project.status)">
            {{ project.status }}
          </el-tag>
        </div>

        <div class="project-info">
          <p>创建时间：{{ formatDate(project.create_time) }}</p>
          <p>创建者：{{ project.user_name }}</p>
        </div>

        <div class="project-actions">
          <el-button 
            type="primary" 
            link
            @click="continueProject(project)"
          >
            继续检测
          </el-button>
          <el-button 
            type="info" 
            link
            @click="viewDetails(project)"
          >
            查看详情
          </el-button>
          <el-button 
            type="warning" 
            link
            @click="editReport(project)"
          >
            编辑报告
          </el-button>
          <el-popconfirm
            title="确定要删除这个项目吗？"
           
            confirm-button-text="确定"
            cancel-button-text="取消"
          >
            <template #reference>
              <el-button 
                type="danger" 
                link
              >
                删除
              </el-button>
            </template>
          </el-popconfirm>
        </div>
      </el-card>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore" class="load-more">
      <el-button :loading="loading" @click="loadMore">加载更多</el-button>
    </div>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailsVisible"
      title="项目详情"
      width="60%"
      :before-close="handleDialogClose"
    >
      <div v-if="projectDetails" class="project-details">
        <div class="details-section">
          <h4>图片列表</h4>
          <el-table :data="projectDetails.images" stripe>
            <el-table-column prop="image_name" label="图片名称" />
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="have_crack" label="裂缝状态">
              <template #default="{ row }">
                <el-tag :type="row.have_crack === '1' ? 'danger' : 'success'">
                  {{ row.have_crack === '1' ? '有裂缝' : '无裂缝' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作">
              <template #default="{ row }">
                <el-button type="primary" link @click="viewImageDetails(row)">
                  查看分割结果
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      <div v-else class="loading-details">
        <el-empty description="加载中..." v-if="loadingDetails" v-loading="true" />
        <el-empty description="暂无数据" v-else />
      </div>
    </el-dialog>

    <!-- 图片详情对话框 -->
    <el-dialog
      v-model="imageDetailsVisible"
      title="分割结果详情"
      width="80%"
    >
      <div v-if="selectedImage" class="image-details">
        <div class="overview-section">
          <h4>分割概览</h4>
          <el-image
            v-if="selectedImage.segoverview"
            :src="selectedImage.segoverview.image_path"
            fit="contain"
            class="detail-image"
          />
        </div>
        <div class="segments-section">
          <h4>几何变换</h4>
          <div class="segments-grid">
            <div v-for="seg in selectedImage.segimages" :key="seg.seg_id" class="segment-item">
              <el-image
                :src="seg.image_path"
                fit="contain"
                class="segment-image"
              />
              <div class="crack-images">
                <el-image
                  v-for="crack in seg.crackimages"
                  :key="crack.crack_id"
                  :src="crack.image_path"
                  fit="contain"
                  class="crack-image"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'

const router = useRouter()
const projects = ref([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = 12
const detailsVisible = ref(false)
const imageDetailsVisible = ref(false)
const projectDetails = ref(null)
const selectedImage = ref(null)
const loadingDetails = ref(false)

// 获取项目列表
const fetchProjects = async () => {
  try {
    loading.value = true
    const authToken = localStorage.getItem('authToken')
    if (!authToken) {
      ElMessage.error('请先登录')
      return
    }

    console.log("authToken",authToken)
    const decoded = jwtDecode(authToken)
    console.log("authToken",decoded)
    const response = await axios.get('/crackdetection/getProject', {
      params: {
        user_name: decoded.username,
      }
    })

    if (response.data.error) {
      ElMessage.error(response.data.error)
      return
    }

    // 添加新项目到列表
    projects.value = [...projects.value, ...response.data.projects]
    hasMore.value = response.data.projects.length === pageSize
  } catch (error) {
    ElMessage.error('获取项目列表失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// 加载更多
const loadMore = () => {
  page.value++
  fetchProjects()
}

// 添加检查待处理图片的函数
const checkPendingImages = async (projectId) => {
  try {
    const response = await axios.get(`/crackdetection/getPendingImages/${projectId}`)
    return Array.isArray(response.data) && response.data.length > 0
  } catch (error) {
    console.error('Failed to check pending images:', error)
    throw error
  }
}

// 修改继续项目函数
const continueProject = async (project) => {
  try {
    // 先检查是否有待处理的图片
    const hasPendingImages = await checkPendingImages(project.project_id)
    
    if (hasPendingImages) {
      // 如果有待处理的图片，跳转到目标检测页面
      router.push({
        path: '/crackdetect/ObjectDetection',
        query: {
          project_id: project.project_id
        }
      })
    } else {
      // 如果没有待处理的图片，跳转到上传图片页面
      router.push({
        path: '/crackdetect/UploadImage',
        query: {
          project_id: project.project_id
        }
      })
    }
  } catch (error) {
    console.error('Error in continueProject:', error)
    ElMessage.error('继续项目失败：' + error.message)
  }
}

// 查看项目详情
const viewDetails = (project) => {
  router.push({
    path: '/crackdetect/ProjectDetail',
    query: { id: project.project_id }
  })
}

// 查看图片详情
const viewImageDetails = (image) => {
  selectedImage.value = image
  imageDetailsVisible.value = true
}

// 关闭对话框前清理数据
const handleDialogClose = () => {
  projectDetails.value = null
  detailsVisible.value = false
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  // 直接加8小时（8 * 60 * 60 * 1000 毫秒）
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)
  return beijingTime.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
// 获取状态标签类型
const getStatusType = (status) => {
  const types = {
    'pending': 'warning',
    'processing': 'primary',
    'completed': 'success',
    'failed': 'danger'
  }
  return types[status] || 'info'
}

// 删除项目
const deleteProject = async (projectId) => {
  try {
    const response = await axios.delete(`/crackdetection/deleteProject/${projectId}`)
    
    if (response.data.message) {
      ElMessage.success('项目删除成功')
      // 从列表中移除已删除的项目
      projects.value = projects.value.filter(p => p.project_id !== projectId)
    } else {
      throw new Error(response.data.message || '删除失败')
    }
  } catch (error) {
    console.error('Failed to delete project:', error)
    ElMessage.error('删除项目失败：' + error.message)
  }
}

// 编辑报告
const editReport = (project) => {
  router.push({
    path: '/crackdetect/editReport',
    query: { id: project.project_id }
  })
}

onMounted(() => {
  fetchProjects()
})
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #F5F7FA;
  min-height: 100vh;
  /* 添加以下样式确保可以滚动 */
  overflow-y: auto;
  max-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  color: #1989FA;
  margin: 0;
}

.new-project-btn {
  background-color: #1989FA;
  border-color: #1989FA;
}

.new-project-btn:hover {
  background-color: #409EFF;
  border-color: #409EFF;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.project-card {
  background-color: #FFFDFA;
  transition: transform 0.2s;
  border: 1px solid #E4E7ED;
}

.project-card:hover {
  transform: translateY(-5px);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.project-header h3 {
  margin: 0;
  color: #303133;
}

.project-info {
  color: #606266;
  font-size: 14px;
}

.project-info p {
  margin: 5px 0;
}

.project-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 15px;
}

.load-more {
  text-align: center;
  margin-top: 20px;
}

:deep(.el-button--danger.el-button--link) {
  color: #F56C6C;
}

:deep(.el-button--danger.el-button--link:hover) {
  color: #f89898;
}

.project-details {
  padding: 20px;
}

.details-section {
  margin-bottom: 20px;
}

.details-section h4 {
  margin-bottom: 16px;
  color: #303133;
}

.loading-details {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-image {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.segments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.segment-item {
  border: 1px solid #E4E7ED;
  border-radius: 4px;
  padding: 10px;
}

.segment-image {
  width: 100%;
  height: 200px;
  object-fit: contain;
  margin-bottom: 10px;
}

.crack-images {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.crack-image {
  width: 100%;
  height: 150px;
  object-fit: contain;
}
</style>