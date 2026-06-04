<template>
<div style="height: 40%;display: flex;">
    <div class="small-title">上传图片</div>
    <div style="width: 60%;display: flex;justify-content: center; position: relative;">
      <el-button v-if="uploadedImages.length" type="primary" plain class="upload-button" @click="startDetection">确认上传</el-button>  
      <el-upload
            class="upload"
            drag
            multiple
            :before-upload="handleBeforeUpload"
            :http-request="customUpload"
            :before-remove="handleRemove"
        >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
            将图片拖到此处或<em>点击上传</em>
            </div>
            <template #tip>
            <div class="el-upload__tip" style="text-align: center;">
                jpg/png files with a size less than 1024kb
            </div>
            </template>
        </el-upload>
    </div>
</div>
<div style="height: 60%;display: flex;">
    <div class="small-title">已上传图片</div>
    <div style="width: 65%;display: flex;justify-content: center;">
        <el-carousel trigger="click" :autoplay="false" arrow="always" height="90%" class="pics">
            <el-carousel-item v-for="(item, index) in carouselImages" :key="index">
              <div class="pic-name">
                <span>{{ item.name }}</span>
                <el-tag v-if="item.detected" type="success" effect="dark" round class="item">已检测</el-tag>
                <el-tag v-else type="warning" effect="dark" round class="item">未检测</el-tag>
              </div>
              <el-image 
                :src="item.src" 
                fit="contain"
                :preview-src-list="previewSrcList"
                :initial-index="index"
                :preview-teleported="true"
                class="carousel-image"
            />
            </el-carousel-item>
        </el-carousel>
    </div>
</div>
</template>

<script setup>
import { UploadFilled } from '@element-plus/icons-vue'
import { ref, onMounted } from 'vue';
import axios from 'axios'
import { useCrackDetectionStore } from '../store/CrackDetection'
const store = useCrackDetectionStore()

  // 内置的用户名和密码
  const credentials = {
    userName: 'crack-detection',
    password: 'tongji-icw-7384'
  };

// 图片数据
const carouselImages = ref([]);

const previewSrcList = computed(() => {
  return carouselImages.value.map(item => item.src);
});

  const handleBeforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      ElMessage.error('只能上传图片文件！');
      return false;
    }
    return true;
};

const handleRemove = (file, fileList) => {
    // 从 uploadedImages 中移除
  uploadedImages.value = uploadedImages.value.filter(img => img.name !== file.name);

  // 从 pendingFiles 中移除（可以用 name 或其他属性判断）
  pendingFiles.value = pendingFiles.value.filter(f => f.name !== file.name);

  // 如果你要阻止删除，返回 false；否则返回 true
  return true;
};

  const uploadedImages = ref([]);
  const pendingFiles = ref([]);
  const uploadProgress = ref(0);

  const customUpload = async (options) => {
    const { file } = options;
    const localUrl = URL.createObjectURL(file);
    pendingFiles.value.push(file);
    uploadedImages.value.unshift({
      name: file.name,
      url: localUrl,
      status: 'pending'
    });

    ElMessage.success('图片已添加，请点击按钮确认上传');
};

const startDetection = async () => {
    if (pendingFiles.value.length === 0) {
      ElMessage.warning('请先添加图片');
      return;
    }
  
    if (!store.projectId) {
      ElMessage.error('项目ID不存在，请重新创建项目');
      store.preStep();
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
          `http://8.159.143.133:9000/oss/upload/${targetPath}`,
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
              project_id: store.projectId,
              image_path: response.data
            });
            
            if (imageResponse.data.error) {
              ElMessage.error(imageResponse.data.error);
              return;
            }
    
              carouselImages.value.push({ 
                  detected: false,
                  src: response.data,
                  name: response.data.split('/').pop(), // 从路径中提取文件名
                  image_id: imageResponse.data.image_id
              });
          } catch (error) {
            ElMessage.error('保存图片记录失败：' + error.message);
            return;
          }
        }
      }
  
      ElMessage.success('所有图片上传完成!');
      
    } catch (error) {
      console.error('上传失败:', error);
      ElMessage.error(`上传失败: ${error.response?.data?.message || error.message}`);
    } finally {
      uploadProgress.value = 0;
    }
  };

const fetchPendingImages = async (projectId) => {
  try {
    const response = await axios.get(`/crackdetection/getProjectHierarchy/${projectId}`)
    
    // 如果返回的是数组，说明有待处理的图片
    if (Array.isArray(response.data.images)) {
      carouselImages.value = response.data.images.map(img => {
        const overview = img.segoverviews?.find(o => o.segimages.length > 0);
        return {
          detected: img.status == "processed" || overview?.segimages.length>0,
          src: img.image_path,
          name: img.image_path.split('/').pop(), // 从路径中提取文件名
          image_id: img.image_id
        }
      })
    } 
    // 如果返回消息是没有待处理图片，则跳转到历史记录页面
    else if (response.data.message === "No pending images found") {
      ElMessage.success('所有图片已处理完成，请前往历史记录页面查看记录并打印报告')
      store.preStep();
      return
    } 
    // 其他情况可能是错误
    else {
      console.log('获取图片列表失败:', response.data.images)
      throw new Error('获取图片列表失败')
    }
  } catch (error) {
    console.error('Failed to fetch pending images:', error)
    ElMessage.error('获取待处理图片失败：' + error.message)
  }
}

onMounted(() => {
  const projectId = store.projectId
  if (!projectId) {
    ElMessage.error('项目ID不存在')
    router.push('/crackdetect/history')
    return
  }
  
  fetchPendingImages(projectId)
})
</script>

<style scoped>
:deep(.el-upload-list) {
  position: absolute;
  right:-10vw;
  width: 15vw;
  top: 10%;
  z-index: 999;
}

.upload-button{
  position: absolute;
  top: -1vh;
  right:-5vw;
}

.small-title{
    font-size: 28px;
    font-weight: bold;
    color: black;
    width: 16%;
    margin-right: 2vw;
}

.upload{
    width: 60%;
    margin-top: 4%;
    margin-left: 3vw;
}

:deep(.el-upload-dragger) {
  border-color: #93c8fc;
  border-width: 2px;
  border-style: dashed;
}

:deep(.el-upload-dragger:hover) {
  border-color: #409EFF;
}

.pics{
    width: 100%;
    background-color: #D6D6D6;
    margin-top: 3vh;
    position: relative;
}

.pic-name{
  color: black;
  position: absolute;
  top:2.5%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.item {
  margin-left: 5%;
}

.carousel-image {
    display: block;
    width: 60%;
    height: 100%;
    margin-left: auto;
    margin-right: auto;
    margin-top: 5%;
}

.pics :deep(.el-carousel__indicator--outside button) {
  background-color: #c0c4cc;
}

.pics :deep(.el-carousel__indicator--outside.is-active button) {
  background-color: white;
}

/* 自定义箭头样式 */
.pics :deep(.el-carousel__arrow) {
  background-color: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 20px;
}

.pics :deep(.el-carousel__arrow:hover) {
  background-color: rgba(0, 0, 0, 0.5);
}
</style>