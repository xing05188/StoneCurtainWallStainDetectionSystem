<template>
  <div class="container">
    <!-- 步骤导航 -->
    <el-steps class="stepsStyle" :active="1" finish-status="success" simple>
      <el-step title="上传图片" @click="$router.push('/crackdetect/UploadImage')" />
      <el-step title="幕墙块检测分割" />
      <el-step title="裂缝检测" />
      <el-step title="裂缝测量" />
    </el-steps>

    <el-container class="main-content">
      <!-- 左侧图片列表 -->
      <el-aside width="auto">
        <el-collapse v-model="isCollapse" class="image-list">
          <el-collapse-item>
            <template #title>
              <div class="collapse-header">
                <span>图片列表</span>
                <el-badge :value="uploadedImages.length" class="image-count" />
              </div>
            </template>
            <div class="thumbnail-list">
              <div 
                v-for="(image, index) in uploadedImages" 
                :key="index"
                class="image-item"
                :class="{ 
                  active: currentImageIndex === index,
                  disabled: image.disabled || globalLoading
                }"
                @click="!globalLoading && selectImage(index)"
              >
                <el-image 
                  :src="image.url" 
                  fit="cover"
                  class="thumbnail"
                />
                <el-tooltip :content="image.name" placement="right">
                  <span class="image-name">{{ image.name }}</span>
                </el-tooltip>
                <el-tag 
                  :type="image.detected ? 'success' : 'warning'"
                  size="small"
                >
                  {{ image.detected ? '已检测' : '未检测' }}
                </el-tag>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-aside>

      <!-- 主要内容区域 -->
      <el-main>
        <div class="main-scroll">
          <el-card class="detection-card">
            <template #header>
              <div class="card-header">
                <span>目标检测</span>
                <el-button 
                  type="primary" 
                  @click="startDetection"
                  :disabled="!currentImage || currentImage.detected || loading || globalLoading"
                  :loading="loading"
                >
                  {{ loading ? '检测中...' : '开始检测' }}
                </el-button>
              </div>
            </template>

            <div class="three-column-grid" v-if="currentImage">
              <div class="original-image">
                <h3>原始图片</h3>
                <el-image
                  :src="currentImage.url"
                  fit="contain"
                  class="preview-image"
                  :preview-src-list="[currentImage.url]"
                />
              </div>
              <div class="segment-result">
                <h3>分割结果</h3>
                <el-image
                  v-if="currentImage.segmentWholeUrl"
                  :src="currentImage.segmentWholeUrl"
                  fit="contain"
                  class="preview-image"
                  :preview-src-list="[currentImage.segmentWholeUrl]"
                />
                <div v-else class="no-result">等待检测</div>
              </div>
              <div class="detail-results">
                <h3>几何变换</h3>
                <div class="detail-grid">
                  <div v-for="(url, index) in currentImage.detailUrls" :key="index" class="detail-item">
                    <el-image
                      :src="url"
                      fit="contain"
                      class="detail-image"
                      :preview-src-list="[url]"
                    />
                    <span class="detail-label">区域 {{ index + 1 }}</span>
                  </div>
                </div>
              </div>
            </div>
            <el-empty v-else description="请选择要检测的图片" />
          </el-card>

          <div class="action-footer">
            <el-button 
              type="primary" 
              @click="nextStep"
              :disabled="!canProceed || globalLoading"
            >
              下一步
            </el-button>
          </div>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const isCollapse = ref(['1'])
const currentImageIndex = ref(null)
const loading = ref(false)
const uploadedImages = ref([
  // 这里应该从上一步获取图片列表
])

const currentImage = computed(() => {
  if (currentImageIndex.value === null) return null
  return uploadedImages.value[currentImageIndex.value]
})

const canProceed = computed(() => {
  return uploadedImages.value.some(img => img.detected)
})

const selectImage = (index) => {
  currentImageIndex.value = index
}

// 添加全局加载状态
const globalLoading = ref(false)

// 添加重试次数计数器
const retryCount = ref(0)
const MAX_RETRIES = 1 // 最大重试次数

const startDetection = async () => {
  if (!currentImage.value || globalLoading.value) return
  
  try {
    loading.value = true
    globalLoading.value = true // 设置全局加载状态
    
    // 禁用所有图片的点击
    uploadedImages.value = uploadedImages.value.map(img => ({
      ...img,
      disabled: true
    }))

    const response = await axios.post('/crackdetection/crack-detection/preprocess_file', {
      image_path: currentImage.value.serverUrl
    })

    if (response.data.success) {
      const urls = response.data.data.result_urls
      
      // 更新检测结果
      currentImage.value.detected = true
      currentImage.value.detailUrls = urls.filter(url => !url.includes('segment-whole'))
      currentImage.value.segmentWholeUrl = urls.find(url => url.includes('segment-whole'))

      // 调用 addSegOverview 接口上传分割结果
      try {
        const overviewResponse = await axios.post('/crackdetection/addSegOverview', {
          image_id: currentImage.value.image_id,
          image_path: currentImage.value.segmentWholeUrl
        })
        
        if (overviewResponse.data.segoverview_id) {
          console.log('SegOverview Response:', overviewResponse.data)
          currentImage.value.segoverview_id = overviewResponse.data.segoverview_id
          retryCount.value = 0 // 重置重试计数器
          
          // 检查是否还有未检测的图片，自动选择下一张
          const nextUndetectedIndex = uploadedImages.value.findIndex(
            (img, index) => index > currentImageIndex.value && !img.detected
          )
          if (nextUndetectedIndex !== -1) {
            currentImageIndex.value = nextUndetectedIndex
            await startDetection() // 递归调用检测下一张
          }
        } else {
          throw new Error('添加分割概览失败')
        }
      } catch (error) {
        console.error('Error adding segment overview:', error)
        throw error
      }
    } else {
      throw new Error('预处理失败')
    }
  } catch (error) {
    ElMessage.error('检测失败：' + error.message)
    if (currentImage.value) {
      currentImage.value.detected = false
      
      // 如果还没有超过最大重试次数，则重试
      if (retryCount.value < MAX_RETRIES) {
        retryCount.value++
        ElMessage.warning(`检测失败，正在进行第 ${retryCount.value} 次重试...`)
        await startDetection() // 重试当前图片
      } else {
        retryCount.value = 0 // 重置重试计数器
        
        // 检查是否还有未检测的图片
        const nextUndetectedIndex = uploadedImages.value.findIndex(
          (img, index) => index > currentImageIndex.value && !img.detected
        )
        if (nextUndetectedIndex !== -1) {
          currentImageIndex.value = nextUndetectedIndex
          await startDetection() // 继续检测下一张
        }
      }
    }
  } finally {
    loading.value = false
    // 只有在所有图片都处理完或出错且不再重试时才解除全局加载状态
    const hasUndetectedImages = uploadedImages.value.some(
      (img, index) => index > currentImageIndex.value && !img.detected
    )
    if (!hasUndetectedImages || retryCount.value >= MAX_RETRIES) {
      globalLoading.value = false
      // 恢复图片的点击状态
      uploadedImages.value = uploadedImages.value.map(img => ({
        ...img,
        disabled: false
      }))
    }
  }
}

const nextStep = () => {
  // 只收集已检测的图片数据
  const processedImages = uploadedImages.value
    .filter(img => img.detected) // 只选择已检测的图片
    .map(img => ({
      transformed_image: img.segmentWholeUrl,
      detail_images: img.detailUrls,
      original_image: img.url,
      image_id: img.image_id,
      segoverview_id: img.segoverview_id
    }))

  // 如果没有选择任何已检测的图片，显示提示
  if (processedImages.length === 0) {
    ElMessage.warning('请选择已检测的图片')
    return
  }

  // 从当前路由获取 project_id
  const projectId = route.query.project_id

  router.push({
    path: '/crackdetect/CrackDetection',
    query: {
      images: JSON.stringify(processedImages),
      project_id: projectId
    }
  })
}

const fetchPendingImages = async (projectId) => {
  try {
    const response = await axios.get(`/crackdetection/getPendingImages/${projectId}`)
    
    // 如果返回的是数组，说明有待处理的图片
    if (Array.isArray(response.data)) {
      uploadedImages.value = response.data.map(img => ({
        ...img,
        detected: false,
        detailUrls: [],
        segmentWholeUrl: null,
        url: img.image_path,
        name: img.image_path.split('/').pop(), // 从路径中提取文件名
        image_id: img.image_id,
        serverUrl: img.image_path  // 添加 serverUrl 字段，与原来的结构保持一致
      }))
    } 
    // 如果返回消息是没有待处理图片，则跳转到历史记录页面
    else if (response.data.message === "No pending images found") {
      ElMessage.success('所有图片已处理完成，请前往历史记录页面查看记录并打印报告')
      router.push('/crackdetect/history')
      return
    } 
    // 其他情况可能是错误
    else {
      console.log('获取图片列表失败:', response.data)
      throw new Error('获取图片列表失败')
    }
  } catch (error) {
    console.error('Failed to fetch pending images:', error)
    ElMessage.error('获取待处理图片失败：' + error.message)
  }
}

onMounted(() => {
  const projectId = route.query.project_id
  if (!projectId) {
    ElMessage.error('项目ID不存在')
    router.push('/crackdetect/history')
    return
  }
  
  fetchPendingImages(projectId)
})
</script>

<style scoped>
.container {
  background-color: #F5F7FA;
  padding: 20px;
  min-height: 100vh;
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

.image-name {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
  font-size: 14px;
  color: #606266;
  margin-bottom: 5px;
}

.detection-card {
  background-color: #FFFFFF;
  border: 1px solid #E4E7ED;
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.image-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.image-container {
  text-align: center;
}

.no-result {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F5F7FA;
  border-radius: 4px;
  color: #606266;
  min-height: 300px;
}

.action-footer {
  text-align: center;
  margin-top: 20px;
}

:deep(.el-step__title) {
  white-space: nowrap;
  font-size: 14px;
}

:deep(.el-button--primary) {
  background-color: #1989FA;
  border-color: #1989FA;
}

:deep(.el-button--primary:hover) {
  background-color: #409EFF;
  border-color: #409EFF;
}

:deep(.el-collapse-item__content) {
  padding: 0;
}

.main-scroll {
  height: calc(100vh - 140px);
  overflow-y: auto;
  padding-right: 10px;
}

.preview-image {
  height: calc(100vh - 400px);
  width: 100%;
  object-fit: contain;
}

:deep(.el-main) {
  padding: 0 20px;
  overflow: hidden;
}

.three-column-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  padding: 0;
  min-height: calc(100vh - 300px);
  width: 100%;
}

.original-image,
.segment-result {
  text-align: center;
  height: 100%;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.detail-results {
  text-align: center;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  overflow-y: auto;
  flex: 1;
  padding: 0;
  max-height: calc(100vh - 350px);
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
}

.detail-image {
  width: 100%;
  height: 250px;
  object-fit: contain;
  border: 1px solid #E4E7ED;
  border-radius: 4px;
}

.detail-label {
  font-size: 14px;
  color: #606266;
}

.no-result {
  height: calc(100vh - 400px);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F5F7FA;
  border-radius: 4px;
  color: #606266;
}

.detection-card {
  padding: 5px;
  margin: 0;
}

.image-comparison {
  margin: 0;
  padding: 0;
}

:deep(.el-card__body) {
  padding: 5px;
}

:deep(.el-button.is-loading) {
  background-color: #1989FA;
  border-color: #1989FA;
  opacity: 0.8;
}

.image-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style> 