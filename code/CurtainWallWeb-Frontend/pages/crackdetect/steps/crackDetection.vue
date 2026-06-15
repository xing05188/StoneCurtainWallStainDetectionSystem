<template>
<div class="box">
    <div style="width:35%;height: 100%;">
        <div class="box-title">
            <p>分割结果</p>
        </div>
        <div class="box-content">
            <el-image 
             :src="picked.image_path"
             :preview-src-list="[picked.image_path]" 
             style="width:80%;height: 60%;" 
             />
        </div>
    </div>
    <div style="width:65%;height: 100%;">
        <div class="box-title">
            <p>检测结果</p>
            <el-progress :percentage="getDetectionProgress()" style="width:50%;margin-left: auto;margin-right: auto;margin-top: 10px;" />
            <el-button 
                type="primary" 
                style="position: absolute;right: 10%;top:55%" 
                @click="startCrackDetection" 
                :loading="globalLoading"
                :disabled="isAllDetectionComplete"
            >
                开始检测
            </el-button>
        </div>
        <el-scrollbar style="width:100%;height: 82%;">
        <div class="box-content" style="height: 100%;">
            <el-timeline style="width: 90%;height: 100%;">
                <el-timeline-item 
                    v-for="(item, index) in picked.segimages" 
                    :key="index"
                    :timestamp="`区域${index + 1}`"
                    placement="top"
                >
                    <el-card style="height: 20vh;">
                        <!-- 在卡片顶部添加裂缝状态 -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 5px 0; border-bottom: 1px solid #eee;">
                            <span style="font-weight: bold; font-size: 14px;">区域{{ index + 1 }}检测结果</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <!-- 检测完成时显示结果标签 -->
                                <div class="status-container">
                                    <el-tag 
                                        v-if="crackResult && crackResult.length > index && crackResult[index] && crackResult[index].have_crack !== undefined"
                                        :type="crackResult[index].have_crack === '1' ? 'danger' : 'success'"
                                        size="small"
                                        style="font-size: 11px;"
                                    >
                                        {{ crackResult[index].have_crack === '1' ? '有裂缝' : '无裂缝' }}
                                    </el-tag>
                                    <!-- 智能助手分析按钮 - 只在有裂缝时显示 -->
                                    <el-button 
                                        v-if="crackResult && crackResult.length > index && crackResult[index] && crackResult[index].have_crack=== '1'"
                                        type="primary" 
                                        size="small" 
                                        @click="openAIAnalysis(index)"
                                        style="font-size: 11px; padding: 2px 8px; margin-left: 8px;"
                                        :loading="analysisLoading"
                                    >
                                        智能助手分析
                                    </el-button>
                                    <!-- 双模型协同检测按钮 - 只在有裂缝时显示 -->
                                    <el-button 
                                        v-if="crackResult && crackResult.length > index && crackResult[index] && crackResult[index].have_crack=== '1'"
                                        type="warning" 
                                        size="small" 
                                        @click="handleDualModelDetection(index)"
                                        style="font-size: 11px; padding: 2px 8px; margin-left: 8px;"
                                    >
                                        双模型协同检测
                                    </el-button>
                                    <!-- 检测中状态 - 只在两个模型都未检测完成时显示 -->
                                    <span v-else-if="!isDetectionComplete(index)" style="color: #909399; font-size: 12px;">
                                        检测中...
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="result-card">
                            <div>
                                <div style="height: 5%;text-align: center;font-weight: bold">原始图片</div>
                                <div class="image-container">
                                    <el-image
                                     :src="item.image_path" 
                                     :preview-src-list="[item.image_path]"
                                     style="width:80%;height: 80%;" 
                                     >
                                     </el-image>
                                </div>
                            </div>
                            <div>
                                <div style="height: 5%;text-align: center;font-weight: bold">Segformer模型</div>
                                <div class="image-container">
                                    <el-image
                                     :src="item.crackimages[0]" 
                                     :preview-src-list="[item.crackimages[0]]"
                                     style="width:80%;height: 80%;" 
                                     >
                                     <template #error>
                                        <div class="image-slot">
                                            待检测
                                        </div>
                                      </template>
                                     </el-image>
                                </div>
                            </div>
                            <div>
                                <div style="height: 5%;text-align: center;font-weight: bold">CrackDetection模型</div>
                                <div class="image-container">
                                    <el-image
                                     :src="item.crackimages[1]" 
                                     :preview-src-list="[item.crackimages[1]]"
                                     style="width:80%;height: 80%;" 
                                     >
                                     <template #error>
                                        <div class="image-slot">
                                            待检测
                                        </div>
                                      </template>
                                    </el-image>
                                </div>
                            </div>
                        </div>
                    </el-card>
                </el-timeline-item>
            </el-timeline>
        </div>
        </el-scrollbar>
    </div>
</div>


<!-- AI分析结果弹窗 -->
<el-dialog 
    v-model="analysisDialogVisible" 
    title="智能助手分析结果" 
    width="80%"
    :before-close="handleCloseDialog"
>
    <div v-if="analysisLoading" style="text-align: center; padding: 40px;">
        <el-icon class="is-loading" style="font-size: 24px; margin-bottom: 10px;"><Loading /></el-icon>
        <p>AI正在分析中，请稍候...</p>
    </div>
    <div v-else-if="analysisResult">
        <!-- 图片对比展示区域 -->
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 15px; color: #303133;">检测图片对比</h4>
            <div style="display: flex; gap: 20px; justify-content: center;">
                <!-- 原始图片 -->
                <div style="flex: 1; text-align: center;">
                    <h5 style="margin-bottom: 10px; color: #606266;">原始图片</h5>
                    <el-image
                        v-if="currentAnalysisIndex >= 0 && picked && picked.segimages && picked.segimages[currentAnalysisIndex]"
                        :src="picked.segimages[currentAnalysisIndex].image_path"
                        :preview-src-list="[picked.segimages[currentAnalysisIndex].image_path]"
                        style="width: 100%; max-width: 300px; height: 200px; border-radius: 8px; border: 1px solid #dcdfe6;"
                        fit="contain"
                    >
                        <template #error>
                            <div style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; background: #f5f7fa; color: #909399;">
                                图片加载失败
                            </div>
                        </template>
                    </el-image>
                </div>
                <!-- 检测结果图片 -->
                <div style="flex: 1; text-align: center;">
                    <h5 style="margin-bottom: 10px; color: #606266;">CrackDetection检测结果</h5>
                    <el-image
                        v-if="currentAnalysisIndex >= 0 && picked && picked.segimages && picked.segimages[currentAnalysisIndex] && picked.segimages[currentAnalysisIndex].crackimages && picked.segimages[currentAnalysisIndex].crackimages[1]"
                        :src="picked.segimages[currentAnalysisIndex].crackimages[1]"
                        :preview-src-list="[picked.segimages[currentAnalysisIndex].crackimages[1]]"
                        style="width: 100%; max-width: 300px; height: 200px; border-radius: 8px; border: 1px solid #dcdfe6;"
                        fit="contain"
                    >
                        <template #error>
                            <div style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; background: #f5f7fa; color: #909399;">
                                图片加载失败
                            </div>
                        </template>
                    </el-image>
                </div>
            </div>
        </div>
        
        <!-- 分隔线 -->
        <el-divider />
        
        <!-- 免责声明 -->
        <el-alert
            title="此内容由大语言模型生成，请注意辨别"
            type="warning"
            :closable="false"
            style="margin-bottom: 20px;"
        />
        <!-- 分析结果 -->
        <div class="analysis-content" v-html="formatMarkdown(analysisResult.analysis)"></div>
    </div>
    <div v-else-if="analysisError" style="text-align: center; padding: 20px;">
        <el-alert
            :title="analysisError"
            type="error"
            :closable="false"
        />
    </div>
    <template #footer>
        <span class="dialog-footer">
            <el-button @click="handleCloseDialog">关闭</el-button>
        </span>
    </template>
</el-dialog>
<!-- 在 AI 分析对话框的 </el-dialog> 标签后添加 -->

<!-- 双模型协同检测结果弹窗 -->
<el-dialog 
    v-model="dualModelDialogVisible" 
    title="双模型协同检测结果" 
    width="80%"
    :before-close="handleCloseDualModelDialog"
>
    <div v-if="dualModelLoading" style="text-align: center; padding: 40px;">
        <el-icon class="is-loading" style="font-size: 24px; margin-bottom: 10px;"><Loading /></el-icon>
        <p>双模型协同检测中，请稍候...</p>
    </div>
    <div v-else-if="dualModelResult">
        <!-- 检测结果展示区域 -->
        <div style="margin-bottom: 20px;">
            <h4 style="margin-bottom: 15px; color: #303133;">检测结果对比</h4>
            <!-- 原始图片 -->
            <div style="margin-bottom: 30px; text-align: center;">
                <h5 style="margin-bottom: 10px;">原始图片</h5>
                <img 
                    :src="picked.segimages[currentDualModelIndex]?.image_path" 
                    style="max-width: 100%; max-height: 400px; border: 1px solid #ddd; border-radius: 4px;"
                    alt="原始图片"
                />
            </div>
            
            <!-- 检测结果图片 -->
            <div style="text-align: center;">
                <h5 style="margin-bottom: 10px;">检测结果</h5>
                <img 
                    v-if="dualModelResult.data?.merged_results?.merged_highlighted_url"
                    :src="dualModelResult.data.merged_results.merged_highlighted_url" 
                    style="max-width: 100%; max-height: 400px; border: 1px solid #ddd; border-radius: 4px;"
                    alt="检测结果"
                    @error="$event.target.style.display='none'"
                />
                <div v-else style="padding: 50px; background: #f5f5f5; border-radius: 4px; color: #999;">
                    暂无检测结果图片
                </div>
            </div>
        </div>
        
        <!-- 检测信息 -->
        <div style="margin-top: 20px;">
            <h4 style="margin-bottom: 15px; color: #303133;">检测信息</h4>
            <el-descriptions :column="2" border>
                <el-descriptions-item label="是否检测到裂缝">
                    <el-tag :type="(dualModelResult.data?.have_crack === true || dualModelResult.data?.have_crack === 'true') ? 'danger' : 'success'">
                        {{ (dualModelResult.data?.have_crack === true || dualModelResult.data?.have_crack === 'true') ? '是' : '否' }}
                    </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="检测到的区域数量">
                    {{ dualModelResult.data?.crop_regions?.length || 0 }}
                </el-descriptions-item>
            </el-descriptions>
        </div>
        
        <!-- 区域详情 -->
        <div v-if="dualModelResult.data?.crop_regions?.length > 0" style="margin-top: 20px;">
            <h4 style="margin-bottom: 15px; color: #303133;">检测区域详情</h4>
            <el-table :data="dualModelResult.data.crop_regions" style="width: 100%" border>
                <el-table-column prop="id" label="区域ID" width="80" />
                <el-table-column prop="x" label="X坐标" width="80" />
                <el-table-column prop="y" label="Y坐标" width="80" />
                <el-table-column prop="width" label="宽度" width="80" />
                <el-table-column prop="height" label="高度" width="80" />
            </el-table>
        </div>
    </div>
    <div v-else-if="dualModelError" style="text-align: center; padding: 40px;">
        <el-icon style="font-size: 48px; color: #f56c6c; margin-bottom: 16px;"><CircleClose /></el-icon>
        <p style="color: #f56c6c; font-size: 16px;">{{ dualModelError }}</p>
    </div>
</el-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios'
import { useCrackDetectionStore } from '../store/CrackDetection'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
const store = useCrackDetectionStore()

const picked = ref({
    image_path: "",
    segimages:[]
})

const nums = ref(0)
const progress = ref(0)
const globalLoading = ref(false)
const isAllDetectionComplete = computed(() => {
  if (nums.value === 0) return false
  
  for (let i = 0; i < nums.value; i++) {
    if (!isDetectionComplete(i)) {
      return false
    }
  }
  
  return true
})
// 修复：将 null 改为空数组
const crackResult = ref([])
const crackResult2 = ref([])

// 在 AI分析相关数据 部分后添加以下代码
// AI分析相关数据
const analysisDialogVisible = ref(false)
const analysisLoading = ref(false)
const analysisResult = ref(null)
const analysisError = ref(null)
const currentAnalysisIndex = ref(-1)

// 双模型协同检测相关数据
const dualModelDialogVisible = ref(false)
const dualModelLoading = ref(false)
const dualModelResult = ref(null)
const dualModelError = ref(null)
const currentDualModelIndex = ref(-1)

const startCrackDetection = async () => {
  try {
    // 初始化结果数组和进度
    crackResult.value = []
    crackResult2.value = []
    progress.value = 0  // 修改：开始检测时重置进度为0
    let allDetectionSuccess = true
    globalLoading.value = true

    // 为检测请求创建重试函数
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

    // 对每个几何变换的图片进行检测
    for (let i = 0; i < picked.value.segimages.length; i++) {
      const seg = picked.value.segimages[i]

      try {
        const [response1, response2] = await retryDetectionRequests(seg.image_path)

        // 添加第一个模型的检测结果
        crackResult.value.push({
          url: response1.data.data,
          have_crack: response1.data.have_crack ? "1" : "0"  // 将布尔值转换为字符串
        })
        
        // 添加第二个模型的检测结果（只使用 mask_url）
        crackResult2.value.push({
          url: response2.data.data.mask_url
        })

        // 修改：每完成一个区域的检测，进度增加1
        progress.value = i + 1
        seg.crackimages.push(response1.data.data);
        seg.crackimages.push(response2.data.data.mask_url);

        // 上传两个模型的检测结果
        try {
          // 上传第一个模型的检测结果
          console.log('seg_id:', seg.segId)
          await axios.post('/crackdetection/addCrackImage', {
            seg_id: seg.segId,
            image_path: response1.data.data
          })
          
          // 上传第二个模型的检测结果
          await axios.post('/crackdetection/addCrackImage', {
            seg_id: seg.segId,
            image_path: response2.data.data.mask_url
          })

          // 新增：调用更新分割图像的裂缝状态接口
          await axios.post('/crackdetection/update_seg_image', {
            seg_id: seg.segId,
            have_crack: response1.data.have_crack ? "1" : "0"
          })
          
          console.log(`区域 ${i + 1} 裂缝状态已更新: ${response1.data.have_crack ? '有裂缝' : '无裂缝'}`)
        } catch (error) {
          console.error('Error uploading crack detection results or updating seg image:', error)
        }
      } catch (error) {
        allDetectionSuccess = false
        console.error('Detection failed:', error)
        // 修改：即使检测失败，也要更新进度
        progress.value = i + 1
      }
    }

    // 所有检测完成后，更新状态
    if (allDetectionSuccess && crackResult.value.length > 0) {
      // 添加详细的调试日志
      console.log('=== 检测结果分析 ===')
      console.log('crackResult.value:', crackResult.value)
      
      // 检查每个结果的详细信息
      crackResult.value.forEach((result, index) => {
        console.log(`第${index + 1}个区域:`, {
          url: result.url,
          have_crack: result.have_crack,
          have_crack_type: typeof result.have_crack,
          is_crack: result.have_crack === "1" || result.have_crack === true
        })
      })
      
      // 检查是否有裂缝 - 修复判断逻辑
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
          image_id: store.pickedImage.image_id,
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
  } finally {
    globalLoading.value = false
  }
}

onMounted(() => {
  const projectId = store.projectId
  if (!projectId) {
    ElMessage.error('项目ID不存在')
    return
  }

  console.log('debug', store.pickedImage);
  
  // 修复数据结构不匹配的问题
  if (store.pickedImage) {
    picked.value = {
      image_path: store.pickedImage.image_path || '',
      segimages: store.pickedImage.segimages || []
    }
    
    nums.value = picked.value.segimages.length;
    progress.value = 0
    
    console.log('设置后的picked.value:', picked.value)
    console.log('分割概览图片路径:', picked.value.image_path)
    console.log('分割区域数量:', picked.value.segimages.length)
    
    // 添加调试信息：检查每个segimage是否包含segId
    picked.value.segimages.forEach((seg, index) => {
      console.log(`分割区域 ${index}:`, seg)
      console.log(`分割区域 ${index} 的 segId:`, seg.segId)
    })
    
    // 新增：初始化检测结果数组并加载已有数据
    crackResult.value = []
    crackResult2.value = []
    
    picked.value.segimages.forEach((seg, index) => {
      // 检查是否已经有检测结果
      if (seg.crackimages && seg.crackimages.length >= 2) {
        // 加载第一个模型的结果（Segformer）
        crackResult.value[index] = {
          url: seg.crackimages[0],
          have_crack: seg.have_crack // 直接使用 Segmentation.vue 中已经设置的 have_crack
        }
        
        // 加载第二个模型的结果（CrackDetection）
        crackResult2.value[index] = {
          url: seg.crackimages[1]
        }
        
        console.log(`区域 ${index} 已有检测结果:`, {
          segformer: seg.crackimages[0],
          crackdetection: seg.crackimages[1],
          have_crack: seg.have_crack
        })
      }
    })
    
  } else {
    ElMessage.error('未找到图片数据，请先完成图片分割')
  }
})

// 修改获取裂缝状态的函数
const getCrackStatus = (segmentIndex, modelIndex) => {
  // modelIndex: 0 = Segformer模型, 1 = CrackDetection模型
  if (modelIndex === 0) {
    // 检查 crackResult 是否存在且有对应索引的数据
    if (crackResult.value && crackResult.value[segmentIndex]) {
      return crackResult.value[segmentIndex].have_crack
    }
  } else {
    // CrackDetection模型目前没有返回have_crack字段
    // 如果需要，可以在这里添加类似的逻辑
  }
  return null
}

// 计算检测进度的函数
const getDetectionProgress = () => {
  if (nums.value === 0) return 0
  
  let completedCount = 0
  for (let i = 0; i < nums.value; i++) {
    if (isDetectionComplete(i)) {
      completedCount++
    }
  }
  
  return Math.round((completedCount / nums.value) * 100)
}

// 判断某个区域的检测是否完成（两个模型都有结果）
const isDetectionComplete = (index) => {
  // 检查第一个模型（Segformer）是否有结果
  const hasFirstModel = crackResult.value && 
                       crackResult.value.length > index && 
                       crackResult.value[index] && 
                       crackResult.value[index].have_crack !== undefined
  
  // 检查第二个模型（CrackDetection）是否有结果
  const hasSecondModel = crackResult2.value && 
                        crackResult2.value.length > index && 
                        crackResult2.value[index] && 
                        crackResult2.value[index].url
  
  // 两个模型都有结果才算完成
  return hasFirstModel && hasSecondModel
}

// AI分析相关方法
const openAIAnalysis = async (segmentIndex) => {
  try {
    currentAnalysisIndex.value = segmentIndex
    analysisDialogVisible.value = true
    analysisLoading.value = true
    analysisResult.value = null
    analysisError.value = null
    
    // 获取crack-detection模型的检测结果图片URL
    const crackImageUrl = picked.value.segimages[segmentIndex].crackimages[1] // CrackDetection模型结果
    
    if (!crackImageUrl) {
      throw new Error('未找到检测结果图片')
    }
    
    // 调用LLM分析API
    const response = await axios.post('http://110.42.214.164:8001/llm-analyze', {
      url: crackImageUrl
    })
    
    if (response.data.success) {
      analysisResult.value = response.data
    } else {
      throw new Error('分析失败')
    }
    
  } catch (error) {
    console.error('AI分析失败:', error)
    analysisError.value = error.message || '分析失败，请稍后重试'
    ElMessage.error('AI分析失败: ' + (error.message || '请稍后重试'))
  } finally {
    analysisLoading.value = false
  }
}

const handleCloseDialog = () => {
  analysisDialogVisible.value = false
  analysisResult.value = null
  analysisError.value = null
  currentAnalysisIndex.value = -1
}

// 格式化Markdown文本为HTML
const formatMarkdown = (text) => {
  if (!text) return ''
  
  // 简单的Markdown转HTML处理
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // 粗体
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // 斜体
    .replace(/\n\n/g, '</p><p>') // 段落
    .replace(/\n/g, '<br>') // 换行
    .replace(/^/, '<p>') // 开始段落
    .replace(/$/, '</p>') // 结束段落
    .replace(/- (.*?)(<br>|<\/p>)/g, '<li>$1</li>') // 列表项 - 修复：转义 </p>
    .replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>') // 包装列表 - 修复：转义 </li>
}

// 在 formatMarkdown 函数前添加以下方法

// 双模型协同检测方法
const handleDualModelDetection = async (index) => {
  try {
    currentDualModelIndex.value = index
    dualModelDialogVisible.value = true
    dualModelLoading.value = true
    dualModelError.value = null
    dualModelResult.value = null
    
    // 获取图片URL
    const imageUrl = picked.value.segimages[index].image_path
    
    // 调用双模型协同检测API
    const response = await axios.post('http://110.42.214.164:8001/crack-detection/region-detect', {
      url: imageUrl
    })
    
    if (response.data) {
      dualModelResult.value = response.data
      ElMessage.success('双模型协同检测完成')
      console.log('双模型协同检测结果:', dualModelResult.value)
    } else {
      throw new Error('API返回数据格式错误')
    }
  } catch (error) {
    console.error('双模型协同检测失败:', error)
    dualModelError.value = error.response?.data?.message || error.message || '双模型协同检测失败，请重试'
    ElMessage.error('双模型协同检测失败')
  } finally {
    dualModelLoading.value = false
  }
}

// 关闭双模型对话框
const handleCloseDualModelDialog = () => {
  dualModelDialogVisible.value = false
  dualModelLoading.value = false
  dualModelResult.value = null
  dualModelError.value = null
  currentDualModelIndex.value = -1
}
</script>

<style scoped>
.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 15px;
}

.box{
  background-color: white;
  display: flex;
  width: 96%;
  max-width: 96%;
  height: 90%;
  max-height: 90%;
  margin-top: 4%;
  border-color: #171D25;
  border-radius: 5px;
  box-shadow: 0px 0px 10px rgb(81, 81, 81);
}

.box-title{
    height: 15%;
    text-align: center;
    color: black;
    font-size: 20px;
    padding-top: 20px;
    position: relative;
}

.box-content{
    width: 100%;
    height: 85%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.result-card{
    width:100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(3, 1fr); /* 三列布局 */
}

:deep(.el-card__body) {
  padding-right: 0;
  padding-left: 0;
  padding-top: 3%;
  padding-bottom: 0;
  height: 100%;
}

.image-container{
    width: 100%;
    height: 95%;
    display: flex;
    align-items: center;
    justify-content: center;
}

:deep(.el-timeline-item__node) {
  background-color: #07C160; /* 节点颜色 */
}

.crack-status {
  text-align: center;
  margin-top: 5px;
}

.analysis-content {
  line-height: 1.6;
  font-size: 14px;
  color: #333;
}

.analysis-content p {
  margin-bottom: 12px;
}

.analysis-content ul {
  margin: 10px 0;
  padding-left: 20px;
}

.analysis-content li {
  margin-bottom: 5px;
}

.analysis-content strong {
  font-weight: bold;
  color: #409EFF;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
