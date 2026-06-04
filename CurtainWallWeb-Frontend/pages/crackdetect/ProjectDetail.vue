<template>
  <div class="container">
    <div class="header">
      <div class="title-section">
        <el-button icon="ArrowLeft" @click="$router.back()">返回</el-button>
        <h2>{{ projectDetails.project_name }}</h2>
        <el-button type="primary" @click="generateReport">
          生成报告
        </el-button>
      </div>
    </div>

    <el-container class="main-content">
      <!-- 左侧图片列表 -->
      <el-aside width="auto">
        <el-collapse v-model="isCollapse" class="image-list">
          <el-collapse-item>
            <template #title>
              <div class="collapse-header">
                <span>图片列表</span>
                <el-badge :value="projectDetails.images.length" class="image-count" />
              </div>
            </template>
            <div class="thumbnail-list">
              <div 
                v-for="(image, index) in projectDetails.images" 
                :key="image.image_id"
                class="image-item"
                :class="{ active: currentImageIndex === index }"
                @click="selectImage(index)"
              >
                <el-image 
                  :src="image.image_path" 
                  fit="cover"
                  class="thumbnail"
                />
                <div class="image-info">
                  <span class="image-name">图片 {{ index + 1 }}</span>
                  <el-tag size="small" :type="image.have_crack === '1' ? 'danger' : 'success'">
                    {{ image.have_crack === '1' ? '有裂缝' : '无裂缝' }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-aside>

      <!-- 主要内容区域 -->
      <el-main>
        <div class="main-scroll">
          <el-card v-if="currentImage" class="image-card">
            <template #header>
              <div class="card-header">
                <h3>原始图片</h3>
              </div>
            </template>

            <!-- 原始图片 -->
            <el-image
              :src="currentImage.image_path"
              fit="contain"
              class="preview-image"
              :preview-src-list="[currentImage.image_path]"
            />

            <!-- 每个分割概览的结果 -->
            <div v-for="overview in currentImage.segoverviews" :key="overview.segoverview_id" class="overview-section">
              <h3>分割概览</h3>
              <el-image
                :src="overview.image_path"
                fit="contain"
                class="preview-image"
                :preview-src-list="[overview.image_path]"
              />

              <!-- 几何变换和检测结果 -->
              <div class="segments-grid">
                <div 
                  v-for="(seg, index) in sortedSegImages(overview.segimages)" 
                  :key="seg.seg_id" 
                  class="segment-item"
                >
                  <!-- 几何变换图片 -->
                  <div class="image-section">
                    <h5>区域{{ index + 1 }}</h5>
                    <el-image
                      :src="seg.image_path"
                      fit="contain"
                      class="segment-image"
                      :preview-src-list="[seg.image_path]"
                    />
                  </div>

                  <!-- 检测结果 -->
                  <div class="results-grid">
                    <div class="result-item">
                      <h5>Segformer模型</h5>
                      <el-image
                        :src="getCrackImage(seg.crackimages, 'segformer')"
                        fit="contain"
                        class="result-image"
                        :preview-src-list="[getCrackImage(seg.crackimages, 'segformer')]"
                      />
                    </div>
                    <div class="result-item">
                      <h5>CrackDetection模型</h5>
                      <el-image
                        :src="getCrackImage(seg.crackimages, 'mask')"
                        fit="contain"
                        class="result-image"
                        :preview-src-list="[getCrackImage(seg.crackimages, 'mask')]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
          <el-empty v-else description="请选择要查看的图片" />
        </div>
      </el-main>
    </el-container>

    <!-- 报告预览对话框 -->
    <el-dialog
      v-model="reportVisible"
      title="检测报告"
      width="90%"
      :before-close="handleReportClose"
    >
      <div ref="reportContent" class="report-content">
        <div class="report-header">
          <h1>{{ projectDetails.project_name }}</h1>
          <p>创建时间：{{ formatDate(projectDetails.create_time) }}</p>
          <p>创建者：{{ formatUserName(projectDetails.user_name) }}</p>
        </div>
        
        <div v-for="image in projectDetails.images" :key="image.image_id" class="report-image-section">
          <!-- 原始图片和分割预览 -->
          <div class="report-overview">
            <div class="report-image-item">
              <h4>原始图片</h4>
              <el-image :src="image.image_path" fit="contain" />
            </div>
            <div class="report-image-item">
              <h4>分割预览</h4>
              <el-image 
                v-if="image.segoverviews[0]"
                :src="image.segoverviews[0].image_path" 
                fit="contain" 
              />
            </div>
          </div>

          <!-- 检测结果 -->
          <div v-if="image.segoverviews[0]" class="report-results">
            <div 
              v-for="(seg, index) in sortedSegImages(image.segoverviews[0].segimages)" 
              :key="seg.seg_id" 
              class="report-result-row"
            >
              <div class="report-result-item">
                <h4>区域{{ index + 1 }}</h4>
                <el-image :src="seg.image_path" fit="contain" />
              </div>
              <div class="report-result-item">
                <h4>Segformer模型</h4>
                <el-image :src="getCrackImage(seg.crackimages, 'segformer')" fit="contain" />
              </div>
              <div class="report-result-item">
                <h4>CrackDetection模型</h4>
                <el-image :src="getCrackImage(seg.crackimages, 'mask')" fit="contain" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="printReport">
            打印报告
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const route = useRoute()
const projectDetails = ref({
  project_name: '',
  project_id: null,
  images: [],
  user_name: '',
  create_time: '',
})

const isCollapse = ref(['1'])
const currentImageIndex = ref(null)

const currentImage = computed(() => {
  if (currentImageIndex.value === null) return null
  return projectDetails.value.images[currentImageIndex.value]
})

const selectImage = (index) => {
  currentImageIndex.value = index
}

// 获取项目详情
const fetchProjectDetails = async () => {
  try {
    const projectId = route.query.id
    const response = await axios.get(`/crackdetection/getProjectHierarchy/${projectId}`)
    
    // 处理返回的数据
    projectDetails.value = {
      ...response.data,
      // 确保 create_time 被正确赋值
      create_time: response.data.create_time || '',
      // 其他字段保持不变
      project_name: response.data.project_name || '',
      project_id: response.data.project_id || null,
      images: response.data.images || [],
      user_name: response.data.user_name || ''
    }
    
    console.log('Received create_time:', response.data.create_time) // 调试用
    console.log('Formatted create_time:', projectDetails.value.create_time) // 调试用
    
  } catch (error) {
    console.error('Failed to fetch project details:', error)
    ElMessage.error('获取项目详情失败：' + error.message)
  }
}

// 获取对应类型的裂缝检测图片
const getCrackImage = (crackimages, type) => {
  const image = crackimages.find(img => img.image_path.includes(type))
  return image ? image.image_path : ''
}

// 对几何变换图片进行排序
const sortedSegImages = (segimages) => {
  return [...segimages].sort((a, b) => {
    // 从图片路径中提取数字
    const getNumber = (path) => {
      const match = path.match(/rawimage-(\d+)\.png$/)
      return match ? parseInt(match[1]) : 0
    }
    return getNumber(a.image_path) - getNumber(b.image_path)
  })
}

const reportVisible = ref(false)
const reportContent = ref(null)

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    // 直接加8小时（8 * 60 * 60 * 1000 毫秒）
    const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000)
    return beijingTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).replace(/\//g, '-')
  } catch (error) {
    console.error('Date formatting error:', error)
    return dateString // 如果转换失败，返回原始字符串
  }
}

// 生成报告
const generateReport = () => {
  reportVisible.value = true
}

// 打印报告
const printReport = async () => {
  try {
    ElMessage.info('正在生成打印页面，请稍候...')
    
    // 创建新窗口
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    
    // 获取报告内容
    const reportHtml = reportContent.value.innerHTML
    
    // 写入HTML内容
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>检测报告 - ${projectDetails.value.project_name}</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
          }
          .report-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .report-header h1 {
            color: #333;
            margin-bottom: 10px;
          }
          .report-overview {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .report-image-item {
            flex: 1;
            text-align: center;
          }
          .report-image-item h4 {
            margin-bottom: 10px;
            color: #666;
          }
          .report-result-row {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .report-result-item {
            flex: 1;
            text-align: center;
          }
          img {
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          .report-image-section {
            page-break-after: always;
            margin-bottom: 40px;
          }
          .report-image-section:last-child {
            page-break-after: auto;
          }
          @media print {
            body { margin: 0; }
            .report-image-section { page-break-after: always; }
            .report-result-row { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        ${reportHtml}
      </body>
      </html>
    `)
    
    printWindow.document.close()
    
    // 等待新窗口中的图片加载
    const images = printWindow.document.querySelectorAll('img')
    const imageLoadPromises = Array.from(images).map(img => {
      return new Promise((resolve) => {
        if (img.complete && img.naturalHeight !== 0) {
          resolve()
        } else {
          const handleLoad = () => {
            img.removeEventListener('load', handleLoad)
            img.removeEventListener('error', handleLoad)
            resolve()
          }
          img.addEventListener('load', handleLoad)
          img.addEventListener('error', handleLoad)
        }
      })
    })
    
    // 等待所有图片加载完成
    await Promise.race([
      Promise.all(imageLoadPromises),
      new Promise(resolve => setTimeout(resolve, 15000)) // 15秒超时
    ])
    
    // 额外延迟确保渲染完成
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 执行打印
    printWindow.print()
    
    // 打印完成后关闭窗口
    setTimeout(() => {
      printWindow.close()
    }, 1000)
    
  } catch (error) {
    console.error('打印失败:', error)
    ElMessage.error('打印失败，请重试')
  }
}

// 关闭报告对话框
const handleReportClose = () => {
  reportVisible.value = false
}

// 添加用户名格式化函数
const formatUserName = (email) => {
  if (!email) return ''
  // 如果是邮箱格式，只显示@前面的部分
  return email.split('@')[0]
}

onMounted(() => {
  fetchProjectDetails()
})
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #F5F7FA;
  min-height: 100vh;
}

.header {
  margin-bottom: 20px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-section h2 {
  margin: 0;
  color: #1989FA;
}

.main-content {
  flex: 1;
  margin-top: 20px;
}

.image-list {
  background-color: #FFFFFF;
  border: 1px solid #E4E7ED;
  border-radius: 4px;
}

.collapse-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.thumbnail-list {
  height: calc(100vh - 200px);
  overflow-y: auto;
  padding: 10px;
}

.image-item {
  padding: 10px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  height: 80px;
  gap: 10px;
}

.image-item.active {
  background-color: #f0f0f0;
}

.thumbnail {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  flex-shrink: 0;
}

.image-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.image-name {
  font-size: 14px;
  color: #606266;
}

.main-scroll {
  height: calc(100vh - 140px);
  overflow-y: auto;
  padding-right: 10px;
}

:deep(.el-main) {
  padding: 0 20px;
  overflow: hidden;
}

.image-card {
  margin-bottom: 20px;
}

.preview-image {
  max-height: 400px;
  width: 100%;
  object-fit: contain;
  margin-bottom: 20px;
}

.overview-section {
  margin-top: 20px;
  border-top: 1px solid #E4E7ED;
  padding-top: 20px;
  margin-bottom: 40px;
}

.segments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.segment-item {
  border: 1px solid #E4E7ED;
  border-radius: 4px;
  padding: 16px;
}

.segment-image {
  width: 100%;
  height: 200px;
  object-fit: contain;
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}

.result-item {
  text-align: center;
}

.result-image {
  width: 100%;
  height: 150px;
  object-fit: contain;
}

h3, h4, h5 {
  margin: 0;
  margin-bottom: 12px;
  color: #303133;
}

h4 {
  font-size: 16px;
}

h5 {
  font-size: 14px;
  color: #606266;
}

.image-section {
  margin-bottom: 16px;
}

.report-content {
  padding: 20px;
}

.report-header {
  text-align: center;
  margin-bottom: 30px;
}

.report-header h1 {
  margin-bottom: 16px;
  color: #303133;
}

.report-header p {
  margin: 8px 0;
  color: #606266;
}

.report-overview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.report-result-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.report-image-item,
.report-result-item {
  text-align: center;
}

.report-image-item :deep(img),
.report-result-item :deep(img) {
  max-width: 100%;
  height: auto;
}

.dialog-footer {
  text-align: center;
}

@media print {
  .container {
    padding: 0;
    background-color: white;
  }
  
  .header,
  .el-aside,
  .dialog-footer,
  .el-button {
    display: none !important;
  }
  
  .report-content {
    padding: 20px;
  }
  
  .report-image-section {
    page-break-after: always;
  }
  
  .report-result-row {
    break-inside: avoid;
  }
  
  img {
    max-width: 100%;
    height: auto;
  }
}
</style>