<template>
  <div class="container">
    <!-- 步骤导航 -->
    <el-steps class="stepsStyle" :active="2" finish-status="success" simple>
      <el-step title="上传图片" @click="$router.push('/crackdetect/UploadImage')" />
      <el-step title="幕墙块检测分割" @click="$router.push('/crackdetect/ObjectDetection')" />
      <el-step title="裂缝检测" />
      <el-step title="裂缝测量" />
    </el-steps>

    <div class="main-scroll">
      <el-card class="detection-card">
        <template #header>
          <div class="card-header">
            <span>裂缝检测</span>
            <el-button 
              type="primary" 
              @click="startCrackDetection"
            >
              开始检测
            </el-button>
          </div>
        </template>

        <div class="three-column-grid">
          <div class="image-container">
            <h3>分割结果</h3>
            <el-image
              :src="processedImage.transformed_image"
              fit="contain"
              class="preview-image"
              :preview-src-list="[processedImage.transformed_image]"
            />
          </div>
          <div class="image-container">
            <h3>几何变换</h3>
            <div class="detail-grid">
              <div v-for="(url, index) in processedImage.detail_images" :key="index" class="detail-item">
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
          <div class="image-container">
            <h3>Segformer模型</h3>
            <div v-if="crackResult" class="detail-grid">
              <div v-for="(result, index) in crackResult" :key="index" class="detail-item">
                <el-image
                  :src="result.url"
                  fit="contain"
                  class="detail-image"
                  :preview-src-list="[result.url]"
                />
                <div class="result-info">
                  <span class="detail-label">区域 {{ index + 1 }}</span>
                  <el-tag :type="result.have_crack ? 'danger' : 'success'">
                    {{ result.have_crack ? '有裂缝' : '无裂缝' }}
                  </el-tag>
                </div>
              </div>
            </div>
            <div v-else class="detail-grid">
              <div v-for="(_, index) in processedImage.detail_images" :key="index" class="detail-item">
                <div class="no-result">
                  <span>等待检测</span>
                </div>
                <span class="detail-label">区域 {{ index + 1 }}</span>
              </div>
            </div>
          </div>
          <div class="image-container">
            <h3>CrackDetection模型</h3>
            <div v-if="crackResult2" class="detail-grid">
              <div v-for="(result, index) in crackResult2" :key="index" class="detail-item">
                <el-image
                  :src="result.url"
                  fit="contain"
                  class="detail-image"
                  :preview-src-list="[result.url]"
                />
                <div class="result-info">
                  <span class="detail-label">区域 {{ index + 1 }}</span>
                </div>
              </div>
            </div>
            <div v-else class="detail-grid">
              <div v-for="(_, index) in processedImage.detail_images" :key="index" class="detail-item">
                <div class="no-result">
                  <span>等待检测</span>
                </div>
                <span class="detail-label">区域 {{ index + 1 }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <div class="action-footer">
        <el-button 
          type="primary" 
          @click="finishDetection"
          :disabled="!crackResult"
        >
          返回继续检测
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const processedImage = ref({
  transformed_image: '',
  detail_images: [],
  original_image: '',
  image_id: '',
  segoverview_id: ''
})
const crackResult = ref(null)
const crackResult2 = ref(null)

const startCrackDetection = async () => {
  try {
    if (!processedImage.value.segoverview_id) {
      throw new Error('缺少 segoverview_id')
    }

    // 初始化结果数组
    crackResult.value = []
    crackResult2.value = []
    let allDetectionSuccess = true

    // 对每个几何变换的图片进行检测
    for (const url of processedImage.value.detail_images) {
      // 先上传几何变换图片作为 segimage
      let seg_id
      try {
        const segImageResponse = await axios.post('/crackdetection/addSegImage', {
          segoverview_id: processedImage.value.segoverview_id,
          image_path: url
        })
        
        console.log('SegImage Response:', segImageResponse.data)
        
        if (!segImageResponse.data.seg_id) {
          console.error('Failed to add segment image:', segImageResponse.data)
          allDetectionSuccess = false
          continue
        }
        seg_id = segImageResponse.data.seg_id
      } catch (error) {
        console.error('Error adding segment image:', error)
        allDetectionSuccess = false
        continue
      }

      try {
        // 为这两个特定请求创建重试函数
        const retryDetectionRequests = async (url, maxRetries = 3) => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              console.log(`开始第 ${attempt} 次检测请求: ${url}`)
              const [response1, response2] = await Promise.all([
                axios.post('/crackdetection/segformer/predict', {
                  url: url
                }),
                axios.post('/crackdetection/crack-detection/detect', {
                  url: url
                })
              ])
              
              // 检查HTTP状态码
              if (response1.status !== 200 || response2.status !== 200) {
                throw new Error(`HTTP错误 - response1状态: ${response1.status}, response2状态: ${response2.status}`)
              }
              
              // 检查业务逻辑是否成功
              if (response1.data.success && response2.data.success) {
                console.log(`第 ${attempt} 次请求成功`)
                return [response1, response2]
              } else {
                // 业务逻辑失败，抛出错误以触发重试
                const error1 = !response1.data.success ? `segformer预测失败: ${response1.data.message || '未知错误'}` : ''
                const error2 = !response2.data.success ? `crack-detection检测失败: ${response2.data.message || '未知错误'}` : ''
                throw new Error(`业务逻辑失败 - ${error1} ${error2}`.trim())
              }
            } catch (error) {
              console.warn(`检测请求失败，第 ${attempt} 次尝试:`, error.message)
              console.warn('错误详情:', error)
              
              // 检查是否是HTTP错误（包括500错误）
              if (error.response) {
                console.warn(`HTTP错误状态码: ${error.response.status}`)
              }
              
              if (attempt === maxRetries) {
                console.error(`检测请求失败，已重试 ${maxRetries} 次: ${error.message}`)
                throw new Error(`检测请求失败，已重试 ${maxRetries} 次: ${error.message}`)
              }
              
              console.log(`等待 ${1000 * attempt}ms 后进行第 ${attempt + 1} 次重试...`)
              // 等待一段时间后重试（指数退避）
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
            }
          }
        }
        
        try {
          const [response1, response2] = await retryDetectionRequests(url)
          
          // 到这里说明两个请求都成功了，直接处理结果
          // 添加第一个模型的检测结果
          crackResult.value.push({
            url: response1.data.data,
            have_crack: response1.data.have_crack ? "1" : "0"
          })
          
          // 添加第二个模型的检测结果（只使用 mask_url）
          crackResult2.value.push({
            url: response2.data.data.mask_url
          })
      
            // 上传两个模型的检测结果
            try {
              // 添加参数验证和调试日志
              console.log('准备上传检测结果:');
              console.log('seg_id:', seg_id);
              console.log('第一个模型结果:', response1.data.data);
              console.log('第二个模型结果:', response2.data.data.mask_url);
              
              // 验证参数是否存在
              if (!seg_id) {
                throw new Error('seg_id 为空，无法上传检测结果');
              }
              
              if (!response1.data.data) {
                throw new Error('第一个模型的检测结果为空');
              }
              
              if (!response2.data.data.mask_url) {
                throw new Error('第二个模型的mask_url为空');
              }
              
              // 上传第一个模型的检测结果
              const uploadData1 = {
                seg_id: seg_id,
                image_path: response1.data.data
              };
              console.log('上传第一个模型数据:', uploadData1);
              await axios.post('/crackdetection/addCrackImage', uploadData1);
              
              // 上传第二个模型的检测结果
              const uploadData2 = {
                seg_id: seg_id,
                image_path: response2.data.data.mask_url
              };
              console.log('上传第二个模型数据:', uploadData2);
              await axios.post('/crackdetection/addCrackImage', uploadData2);
              
            } catch (error) {
              console.error('Error uploading crack detection results:', error);
              console.error('错误详情:', {
                seg_id: seg_id,
                response1_data: response1.data,
                response2_data: response2.data
              });
            }
        } catch (error) {
          allDetectionSuccess = false
          console.error('Detection failed after retries:', error)
        }
      } catch (error) {
        allDetectionSuccess = false
        console.error('Detection failed:', error)
      }
    }

    // 所有检测完成后，更新状态
    if (allDetectionSuccess && crackResult.value.length > 0) {
      processedImage.value.detected = true
      
      // 添加详细的调试日志
      console.log('=== 检测结果分析 ===')
      console.log('crackResult.value:', crackResult.value)
      
      // 检查每个结果的详细信息
      crackResult.value.forEach((result, index) => {
        console.log(`第${index + 1}个部分:`, {
          url: result.url,
          have_crack: result.have_crack,
          have_crack_type: typeof result.have_crack,
          is_crack: result.have_crack === "1" || result.have_crack === true
        })
      })
      
      // 检查是否有裂缝 - 只要有任何一个部分有裂缝就算有裂缝
      const hasCrack = crackResult.value.some(result => {
        const isCrack = result.have_crack === "1" || result.have_crack === true
        console.log(`检查结果: ${result.have_crack} -> ${isCrack}`)
        return isCrack
      })
      
      console.log('最终判断结果:', hasCrack ? '有裂缝' : '无裂缝')
      console.log('===================')
      
      try {
        // 上传检测状态
        const updateData = {
          image_id: processedImage.value.image_id,
          have_crack: hasCrack ? "1" : "0",
          status: "processed"
        }
        
        console.log('准备上传的数据:', updateData)
        
        await axios.post('/crackdetection/update_image', updateData)
        
        console.log('状态更新成功')
      } catch (error) {
        console.error('Error updating image status:', error)
      }
    }
  } catch (error) {
    ElMessage.error('检测失败：' + error.message)
  }
}

// 修改检查待处理图片的函数
const checkPendingImages = async (projectId) => {
  try {
    const response = await axios.get(`/crackdetection/getPendingImages/${projectId}`)
    // 如果返回的是数组，说明有待处理的图片
    if (Array.isArray(response.data)) {
      return response.data.length > 0
    }
    // 如果返回的是包含 message 的对象，说明没有待处理的图片
    if (response.data.message === "No pending images found") {
      return false
    }
    // 其他情况可能是错误
    throw new Error('获取待处理图片失败')
  } catch (error) {
    console.error('Failed to check pending images:', error)
    throw error
  }
}

// 修改 finishDetection 函数
const finishDetection = async () => {
  try {
    // 检查是否有裂缝
    console.log('crackResult.value:', crackResult.value)
    console.log('have_crack values:', crackResult.value.map(r => r.have_crack))
    const hasCrack = crackResult.value.some(result => 
      result.have_crack === "1" || result.have_crack === true
    )
    console.log('Final hasCrack result:', hasCrack)

    // 上传检测状态
    await axios.post('/crackdetection/update_image', {
      image_id: processedImage.value.image_id,
      have_crack: hasCrack ? "1" : "0",
      status: "processed"
    })

    // 从 URL 中获取 project_id
    const urlParams = new URLSearchParams(window.location.search)
    const projectId = urlParams.get('project_id')

    // 检查是否还有未处理的图片
    const hasPendingImages = await checkPendingImages(projectId)

    if (hasPendingImages) {
      // 如果还有未处理的图片，继续检测
      router.push({
        path: '/crackdetect/ObjectDetection',
        query: {
          project_id: projectId
        }
      })
    } else {
      // 如果没有未处理的图片，直接跳转到项目详情页面
      ElMessage.success('所有图片已处理完成，正在跳转到项目详情页面')
      router.push({
        path: '/crackdetect/ProjectDetail',
        query: {
          project_id: projectId
        }
      })
    }
  } catch (error) {
    console.error('Error in finishDetection:', error)
    ElMessage.error('更新检测状态失败：' + error.message)
  }
}

onMounted(() => {
  try {
    const imagesData = JSON.parse(route.query.images || '[]')[0]
    processedImage.value = {
      ...imagesData,
      detected: false  // 确保初始状态为未检测
    }
    console.log('Received segoverview_id:', processedImage.value.segoverview_id)

    // 从 URL 获取 project_id 并保存到 query 中
    const urlParams = new URLSearchParams(window.location.search)
    const projectId = urlParams.get('project_id')
    if (projectId) {
      route.query.project_id = projectId
    }
  } catch (error) {
    console.error('Failed to parse images data:', error)
    ElMessage.error('加载图片数据失败')
  }
})
</script>

<style scoped>
.container {
  background-color: #F5F7FA;
  padding: 20px;
  min-height: 100vh;
  height: 100vh;
  overflow-y: auto;
}

.main-scroll {
  flex: 1;
  margin-top: 20px;
}

.image-list {
  background-color: #FFFFFF;
  border: 1px solid #E4E7ED;
  border-radius: 4px;
}

/* ... 其他样式与 ObjectDetection.vue 相同 ... */

.three-column-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 20px;
  padding: 10px;
}

.image-container {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-image {
  width: 100%;
  height: 400px;
  object-fit: contain;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.detail-image {
  width: 100%;
  height: 250px;
  object-fit: contain;
  border: 1px solid #E4E7ED;
  border-radius: 4px;
}

.no-result {
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #F5F7FA;
  border-radius: 4px;
  color: #606266;
  width: 100%;
}

.detection-card {
  height: auto;
  margin-bottom: 20px;
}

.action-footer {
  margin-bottom: 20px;
}

.result-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 8px;
  margin-top: 4px;
}

.detail-label {
  font-size: 13px;
  color: #606266;
}
</style>