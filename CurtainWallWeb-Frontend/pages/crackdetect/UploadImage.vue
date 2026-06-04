<template>
    <div class="container">
      <!-- 步骤导航 -->
      <el-steps
        class="stepsStyle"
        :active="0"
        finish-status="success"
        simple
      >
        <el-step title="上传图片" class="step-item" />
        <el-step title="幕墙块检测分割" class="step-item" />
        <el-step title="裂缝检测" class="step-item" />
        <el-step title="裂缝测量" class="step-item" />
      </el-steps>
  
      <!-- 内容区域 -->
      <div class="content">
        <el-row :gutter="20">
          <el-col :span="18">
            <el-card
              style="background-color: #fffdfa; padding: 10px;"
            >
              <div class="card-header">
                <div class="header-left">已上传图片</div>
                <div class="header-right">
                  <el-button 
                    type="primary" 
                    :disabled="!uploadedImages.length"
                    @click="startDetection"
                  >
                    开始检测
                  </el-button>
                </div>
              </div>
              <el-scrollbar class="image-scroll">
                <div v-for="(image, index) in uploadedImages" :key="index" class="image-row" :data-status="image.status">
                  <div class="image-container">
                    <div class="image-actions">
                      <el-button
                        type="danger"
                        size="small"
                        circle
                        @click="removeImage(index)"
                        class="delete-btn"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                    <el-image :src="image.url" fit="fill" />
                    <p class="image-info">{{ image.name }}</p>
                  </div>
                </div>
              </el-scrollbar>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card
              style="background-color: #fffdfa; padding: 10px;"
            >
              <el-upload
                class="upload-demo"
                drag
                multiple
                :show-file-list="false"
                :before-upload="handleBeforeUpload"
                :http-request="customUpload"
              >
                <el-icon class="upload-icon"><Upload /></el-icon>
                <div class="el-upload__text">
                  将文件拖到此处或 <em style="color: #b29f82">点击上传</em>
                </div>
              </el-upload>
              <el-progress 
                v-if="uploadProgress > 0 && uploadProgress < 100" 
                :percentage="uploadProgress"
              />
            </el-card>
          </el-col>
        </el-row>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, watch, onBeforeUnmount, onMounted } from "vue";
  import axios from 'axios';
  import { ElMessage } from 'element-plus';
  import { Upload, Delete } from '@element-plus/icons-vue'
  import { useRouter, useRoute } from 'vue-router';
  
  const uploadedImages = ref([]);
  const uploadProgress = ref(0);
  const pendingFiles = ref([]);
  const router = useRouter();
  const route = useRoute();
  
  // 内置的用户名和密码
  const credentials = {
    userName: 'crack-detection',
    password: 'tongji-icw-7384'
  };
  
  const handleBeforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      ElMessage.error('只能上传图片文件！');
      return false;
    }
    return true;
  };
  
  const customUpload = async (options) => {
    const { file } = options;
    const localUrl = URL.createObjectURL(file);
    pendingFiles.value.push(file);
    uploadedImages.value.unshift({
      name: file.name,
      url: localUrl,
      status: 'pending'
    });
    ElMessage.success('图片已添加，请点击开始检测进行上传');
  };
  
  watch(uploadedImages, (newVal) => {
    console.log('uploadedImages changed:', newVal);
  }, { deep: true });
  
  const startDetection = async () => {
    if (pendingFiles.value.length === 0) {
      ElMessage.warning('请先添加图片');
      return;
    }
  
    if (!route.query.project_id) {
      ElMessage.error('项目ID不存在，请重新创建项目');
      router.push('/crackdetect');
      return;
    }
  
    try {
      ElMessage.info('正在上传图片...');
      
      for (let i = 0; i < pendingFiles.value.length; i++) {
        const file = pendingFiles.value[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userName', credentials.userName);
        formData.append('password', credentials.password);
  
        const targetPath = `crackdetect/${file.name}`;
        
        uploadProgress.value = 0;
        const response = await axios.post(
          `http://110.42.214.164:9000/oss/upload/${targetPath}`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              uploadProgress.value = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
            },
          }
        );
        
        if (response.data) {
          // console.log("response.data:",localStorage.getItem('currentProject')?.project_id)
          // 调用upload_image_url接口
          try {
            const imageResponse = await axios.post('/crackdetection/upload_image_url', {
              project_id: route.query.project_id,
              image_path: response.data
            });
            
            if (imageResponse.data.error) {
              ElMessage.error(imageResponse.data.error);
              return;
            }
            
            // 更新图片状态，包含image_id
            const imageIndex = uploadedImages.value.findIndex(img => img.name === file.name);
            if (imageIndex !== -1) {
              uploadedImages.value[imageIndex].status = 'uploaded';
              uploadedImages.value[imageIndex].serverUrl = response.data;
              uploadedImages.value[imageIndex].image_id = imageResponse.data.image_id;
            }
          } catch (error) {
            ElMessage.error('保存图片记录失败：' + error.message);
            return;
          }
        }
      }
  
      ElMessage.success('所有图片上传完成，开始检测...');
      pendingFiles.value = [];
      
      // 跳转到目标检测页面
      router.push({
        path: '/crackdetect/ObjectDetection',
        query: {
          project_id: route.query.project_id
        }
      });
      
    } catch (error) {
      console.error('上传失败:', error);
      ElMessage.error(`上传失败: ${error.response?.data?.message || error.message}`);
    } finally {
      uploadProgress.value = 0;
    }
  };
  
  const removeImage = (index) => {
    // 如果是blob URL，需要释放
    if (uploadedImages.value[index].url.startsWith('blob:')) {
      URL.revokeObjectURL(uploadedImages.value[index].url);
    }
    // 从待上传文件列表中移除
    const fileName = uploadedImages.value[index].name;
    const fileIndex = pendingFiles.value.findIndex(file => file.name === fileName);
    if (fileIndex > -1) {
      pendingFiles.value.splice(fileIndex, 1);
    }
    // 从显示列表中移除
    uploadedImages.value.splice(index, 1);
  };
  
  onBeforeUnmount(() => {
    uploadedImages.value.forEach(image => {
      if (image.url.startsWith('blob:')) {
        URL.revokeObjectURL(image.url);
      }
    });
  });
  
  const handleUploadSuccess = () => {
    // 从当前路由获取 project_id
    const projectId = route.query.project_id

    router.push({
      path: '/crackdetect/ObjectDetection',
      query: {
        project_id: projectId
      }
    })
  }
  
  onMounted(() => {
    const projectId = route.query.project_id
    if (!projectId) {
      ElMessage.error('项目ID不存在')
      router.push('/crackdetect/history')
      return
    }
  })
  </script>
  
  <style scoped>
  .container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: #F5F7FA;
    padding: 20px;
  }
  
  .stepsStyle {
    margin-bottom: 20px;
    white-space: nowrap;
  }
  
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .image-scroll {
    max-height: 600px;
    overflow-y: auto;
  }
  
  .image-row {
    margin-bottom: 20px;
    text-align: center;
    position: relative;
  }
  
  .image-info {
    margin-top: 5px;
    color: #666;
    font-size: 14px;
  }
  
  .el-progress {
    margin-top: 15px;
  }
  
  .upload-demo {
    text-align: center;
  }
  
  .upload-icon {
    font-size: 48px;
    color: #1989FA;
    margin-bottom: 10px;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .header-left {
    font-size: 16px;
    font-weight: bold;
    color: #303133;
  }
  
  .header-right {
    display: flex;
    align-items: center;
  }
  
  .image-row[data-status="pending"]::after {
    content: "待上传";
    position: absolute;
    top: 10px;
    right: 10px;
    background: #E6A23C;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    z-index: 2;
  }
  
  .image-row[data-status="uploaded"]::after {
    content: "已上传";
    position: absolute;
    top: 10px;
    right: 10px;
    background: #67C23A;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    z-index: 2;
  }
  
  .step-item {
    cursor: pointer;
  }
  
  :deep(.el-step__title) {
    white-space: nowrap;
    font-size: 14px;  /* 可以调整字体大小使其更容易放在一行 */
  }
  
  :deep(.el-button--primary) {
    background-color: #1989FA;
    border-color: #1989FA;
  }
  
  :deep(.el-button--primary:hover) {
    background-color: #409EFF;
    border-color: #409EFF;
  }
  
  .image-container {
    position: relative;
  }
  
  .image-actions {
    position: absolute;
    top: 50px;
    right: 10px;
    z-index: 1;
  }
  
  .delete-btn {
    opacity: 0.8;
    transition: opacity 0.3s;
    background-color: rgba(245, 108, 108, 0.9);
  }
  
  .delete-btn:hover {
    opacity: 1;
  }
  
  :deep(.el-button--danger) {
    background-color: #F56C6C;
    border-color: #F56C6C;
  }
  
  :deep(.el-button--danger:hover) {
    background-color: #f78989;
    border-color: #f78989;
  }
  </style>
  