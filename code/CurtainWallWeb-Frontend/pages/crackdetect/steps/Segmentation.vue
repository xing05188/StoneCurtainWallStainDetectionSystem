<template>
<div style="height: 30%;display: flex;">
    <div class="small-title" style="width: 10%;">图片列表</div>
    <div style="margin-left: 3%;width: 82%;display: flex;justify-content: center;">
        <el-carousel trigger="click" :autoplay="false" arrow="always" height="90%" class="pics">
            <el-carousel-item
             v-for="(group, groupIndex) in groupedImages" 
             :key="groupIndex"
            >
            <div class="image-group">
                <div style="width: 100%;height: 100%;position: relative;" v-for="(item, itemIndex) in group">
                  <div class="pic-name">
                    <span style="margin-left: auto;">{{ item.name }}</span>
                    <el-tag v-if="item.detected" type="success" effect="dark" round class="item">已检测</el-tag>
                    <el-tag v-else type="warning" effect="dark" round class="item">未检测</el-tag>
                  </div>
                  <el-image
                      :key="itemIndex"
                      :src="item.src"
                      fit="scale-down"
                      class="grouped-image"
                      @click="pickImage(item)"
                  />
                </div>
            </div>
            </el-carousel-item>
        </el-carousel>
    </div>
</div>
<div style="height: 67%;margin-top: 3%;">
    <div style="height: 10%;display: flex;align-items: center;">
        <span class="small-title">幕墙块检测分割</span>
        <el-button type="primary" style="margin-left: 50px;" :disabled="picked.detected" :loading="globalLoading" @click="startSeg">开始分割</el-button>
      </div>
    <div class="seg-container">
        <div>
            <div class="pic-title">原始布局</div>
            <div class="pic-container">
              <el-image class="result-pic" :src="picked.origin" :preview-src-list="[picked.origin]">
                <template #error>
                  <div class="image-slot">请选择图片</div>
                </template>
              </el-image>
            </div>
        </div>
        <div>
            <div class="pic-title">分割结果</div>
            <div class="pic-container">
              <el-image class="result-pic" :src="picked.overview" :preview-src-list="[picked.overview]">
                <template #error>
                  <div class="image-slot">请选择图片</div>
                </template>
              </el-image>
            </div>
        </div>
        <div>
            <div class="pic-title">几何变换</div>
            <div class="pic-container">
                <el-carousel trigger="click" indicator-position="none" :autoplay="false" arrow="always" height="90%" class="carouse">
                    <el-carousel-item v-for="(src, index) in picked.segimages" :key="index">
                    <div style="position: absolute;color: black;bottom: 0;left: 45%;z-index: 99;">区域{{ index+1 }}</div>
                    <el-image 
                        :src="src" 
                        alt="暂无图片"
                        :preview-src-list="picked.segimages"
                        :preview-teleported="true"
                        fit="contain"
                        class="carouse-pic"
                    />
                    </el-carousel-item>
                </el-carousel>
            </div>
        </div>
    </div>
</div>
</template>

<script setup>
import { computed } from 'vue';
import { ref, onMounted } from 'vue';
import axios from 'axios'
import { useCrackDetectionStore } from '../store/CrackDetection'
const store = useCrackDetectionStore()

const carouselImages = ref([]);

// 将图片按3个一组分组
const groupedImages = computed(() => {
  const groups = [];
  for (let i = 0; i < carouselImages.value.length; i += 3) {
    groups.push(carouselImages.value.slice(i, i + 3));
  }
  return groups;
});

const picked = ref({
  origin: "",
  overview: "",
  detected:false,
  segimages:[]
})

// 添加全局加载状态
const globalLoading = ref(false)

const pickImage = (image) => {
  if (!globalLoading.value) {
    picked.value.image_id = image.image_id,
    picked.value.origin = image.src
    picked.value.overview = image.segments?.image_path || ""
    picked.value.detected = image.detected
    picked.value.segimages = image.segments?.segimages?.map(seg => seg.image_path) || [];
    store.pickedImage = image.segments;
    store.pickedImage.detected = image.detected;
    store.pickedImage.image_id = image.image_id;
    store.pickedImage.segimages = updatedSegimages;
  }
};

const startSeg = async () => {
  if (!picked.value || globalLoading.value) return
  
  try {
    globalLoading.value = true // 设置全局加载状态
    const response = await axios.post('/crackdetection/crack-detection/preprocess_file', {
      image_path: picked.value.origin
    })

    if (response.data.success) {
      const urls = response.data.data.result_urls
      
      // 更新检测结果
      picked.value.detected = true
      picked.value.segimages = urls.filter(url => !url.includes('segment-whole'))
      picked.value.overview = urls.find(url => url.includes('segment-whole'))
      
      // 修复：完整设置store.pickedImage的数据结构
      store.pickedImage = {
        image_path: urls.find(url => url.includes('segment-whole')), // 分割概览图
        segimages: urls.filter(url => !url.includes('segment-whole')).map(url => ({
          image_path: url,
          crackimages: [] // 初始化裂缝检测结果数组
        })),
        detected: true,
        image_id: picked.value.image_id
      }
      
      const targetImage = carouselImages.value.find(img => img.image_id === picked.value.image_id);
      if (targetImage) {
        targetImage.detected = true;
      }

      // 调用 addSegOverview 接口上传分割结果
      try {
        const overviewResponse = await axios.post('/crackdetection/addSegOverview', {
          image_id: picked.value.image_id,
          image_path: picked.value.overview
        })
        
        if (overviewResponse.data.segoverview_id) {

          store.pickedImage.segId = overviewResponse.data.segoverview_id;

          // 修复：创建一个数组来保存更新后的segimages
          const updatedSegimages = [];
          
          for (const url of picked.value.segimages) {
            // 先上传几何变换图片作为 segimage
            try {
              const segImageResponse = await axios.post('/crackdetection/addSegImage', {
                segoverview_id: overviewResponse.data.segoverview_id,
                image_path: url
              })
          
              // 修复：当seg_id存在时才保存数据
              if (segImageResponse.data.seg_id) {
                updatedSegimages.push({
                  image_path: url,
                  segId: segImageResponse.data.seg_id,  // 保存segId
                  crackimages: []
                });
              } else {
                console.error('Failed to add segment image:', segImageResponse.data)
              }
            } catch (error) {
              console.error('Error adding segment image:', error)
            }
          }
          
          // 修复：更新store.pickedImage.segimages为包含segId的完整数据
          store.pickedImage.segimages = updatedSegimages;
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
  } finally {
    globalLoading.value = false
  }
}

const fetchPendingImages = async (projectId) => {
  try {
    const response = await axios.get(`/crackdetection/getProjectHierarchy/${projectId}`)
    
    // 如果返回的是数组，说明有待处理的图片
    if (response.data.images) {
      carouselImages.value = response.data.images.map(img => {
        const overview = img.segoverviews?.find(o => o.segimages.length > 0);

        return {
          detected: img.status === "processed",
          src: img.image_path,
          name: img.image_path.split('/').pop(),
          image_id: img.image_id,
          segments:{
            image_path: overview?.image_path,
            segimages: overview?.segimages.map(seg => ({
              segId: seg.seg_id,
              image_path: seg.image_path,
              crackimages: seg.crackimages.map(crack => crack.image_path),
              have_crack: seg.have_crack
            }))
          } 
        };
      });
    } 
    // 如果返回消息是没有待处理图片，则跳转到历史记录页面
    else if (response.data.message === "No pending images found") {
      ElMessage.success('所有图片已处理完成，请前往历史记录页面查看记录或打印报告')
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
    return
  }
  
  fetchPendingImages(projectId)
})
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
  font-size: 20px;
}

.small-title{
    font-size: 28px;
    font-weight: bold;
    color: black;
}

.pics{
    width: 100%;
    height: 100%;
    background-color: #D6D6D6;
}

.pic-name{
  color: black;
  position: absolute;
  max-width: 100%;
  width: 100%;
  top:-2vh;
  display: flex;
  align-items: center;
  z-index: 99;
  overflow-x: auto;
}

.item {
  margin-left: 10%;
  margin-right: auto;
}

.image-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 三列布局 */
  gap: 20px; /* 图片间距 */
  height: 100%;
  width: 90%;
  margin: auto;
  padding: 20px;
  box-sizing: border-box;
}

.grouped-image {
  width: 100%;
  height: 100%;
}

:deep(.el-carousel__indicator--outside button) {
  background-color: #c0c4cc;
}

:deep(.el-carousel__indicator--outside.is-active button) {
  background-color: white;
}

/* 自定义箭头样式 */
:deep(.el-carousel__arrow) {
  background-color: rgba(0, 0, 0, 0.3);
  color: white;
  font-size: 20px;
}

:deep(.el-carousel__arrow:hover) {
  background-color: rgba(0, 0, 0, 0.5);
}

.seg-container{
    width: 95%;
    height: 75%;
    margin-top: 2vh;
    border-color: #171D25;
    border-radius: 5px;
    box-shadow: 0px 0px 10px rgb(81, 81, 81);
    display: grid;
    grid-template-columns: repeat(3, 1fr); /* 三列布局 */
}

.pic-title{
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    color: black;
    height: 20%;
    font-size: 20px;
}

.pic-container{
    display: flex;
    justify-content: center;
    width: 100%;
    height: 80%;
    position: relative;
}

.carouse{
    width:  80%;
    height: 85%;
    background-color: #D6D6D6;
}

.carouse-pic{
    display: block;
    width:90%;
    height: 90%;
    margin-left: auto;
    margin-right: auto;
    margin-top: 5%;
}

.result-pic{
    width:80%;
    height: 80%;
}
</style>
