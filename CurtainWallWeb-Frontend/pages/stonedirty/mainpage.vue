<template>
    <div class="main-container">
      <!-- 顶部导航栏 -->
      <div class="header-bar">
        <h2 class="page-title">污渍检测</h2>
        <el-button
          type="primary"
          class="detect-button back-button"
          @click="backToMain"
        >
          <template #icon>
            <el-icon><ArrowLeft /></el-icon>
          </template>
          返回主页
        </el-button>
      </div>

      <!-- 上传区域 -->
      <div class="upload-container" :class="{ 'is-uploading': isUploading }">
        <el-upload
          class="upload-demo"
          drag
          :action="uploadUrl"
          :data="uploadData"
          :before-upload="handleBeforeUpload"
          :on-progress="handleUploadProgress"
          :disabled="isUploading"
          multiple
          @success="handleUploadSuccess"
          @error="handleUploadError"
        >
          <el-icon class="el-icon--upload">
            <UploadFilled />
          </el-icon>
          <div class="el-upload__text">
            {{ isUploading ? '上传中...' : '拖动文件至框内或点击上传' }}
          </div>
          <template #tip>
            <div class="el-upload__tip">支持 jpg/png 格式，文件大小不超过 50MB</div>
          </template>
        </el-upload>
      </div>

      <!-- 图片管理表格 -->
      <div class="image-table-section" style="max-width:1200px;margin:20px auto;">
        <el-table :data="imageList" style="width: 100%" v-if="imageList.length > 0" :row-class-name="tableRowClassName" border>
          <el-table-column prop="name" label="图片名" min-width="200" show-overflow-tooltip />
          <el-table-column prop="uploadTime" label="上传时间" width="180" />
          <el-table-column label="预览" width="120">
            <template #default="scope">
              <el-image :src="scope.row.url" :preview-src-list="[scope.row.url]" style="width:60px;height:60px;object-fit:cover;" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="scope">
              <el-button size="small" @click="selectImage(scope.row.url)" :type="imageUrl === scope.row.url ? 'primary' : 'default'">选择检测</el-button>
              <el-button size="small" type="danger" @click="deleteImage(scope.$index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div v-else style="text-align:center;color:#aaa;padding:20px;">暂无已上传图片</div>
      </div>

      <!-- 操作区域 -->
      <div class="action-bar">
        <el-button
          type="primary"
          class="detect-button"
          :loading="isProcessing"
          :disabled="!imageUrl || isProcessing"
          @click="fetchData"
        >
          <template #icon>
            <el-icon><Search /></el-icon>
          </template>
          {{ isProcessing ? '检测中' : '开始检测' }}
        </el-button>

        <el-button
          type="warning"
          class="export-pdf-button"
          :disabled="!showTable"
          @click="exportPDF"
        >
          <template #icon>
            <el-icon><Document /></el-icon>
          </template>
          导出报告
        </el-button>

        <div class="progress-wrapper" v-if="progressPercentage > 0">
          <el-progress
            :percentage="progressPercentage"
            :status="progressPercentage === 100 ? 'success' : ''"
            :stroke-width="15"
          />
          <span class="progress-text">{{ getProgressText() }}</span>
        </div>
      </div>

      <!-- 结果展示区域 -->
      <div v-loading="isProcessing" class="results-section">
        <div v-if="showTable">
          <!-- 图片分析展示 -->
          <div class="section">
            <h3 class="section-title">图片分析</h3>
            <div class="image-comparison">
              <div class="image-box">
                <div class="image-label">原始图片</div>
                <el-image
                  class="input-image"
                  :src="imageUrl"
                  :preview-src-list="[imageUrl]"
                  :initial-index="0"
                  fit="contain"
                  preview-teleported
                  hide-on-click-modal>
                </el-image>
              </div>
              <div class="image-box" v-if="annotatedImageUrl">
                <div class="image-label">标注结果</div>
                <el-image
                  class="input-image"
                  :src="annotatedImageUrl"
                  :preview-src-list="[annotatedImageUrl]"
                  :initial-index="0"
                  fit="contain"
                  preview-teleported
                  hide-on-click-modal>
                </el-image>
              </div>
            </div>
          </div>

          <!-- 检测结果展示 -->
          <div class="section">
            <h3 class="section-title">检测结果</h3>
            <div v-if="tableData.length === 0" class="no-stain-message">
              <el-empty description="未检测到污渍" />
            </div>
            <div v-else class="results-wall">
              <div
                v-for="(item, index) in tableData"
                :key="index"
                class="result-item">
                <div class="image-pair">
                  <div class="stain-image" v-if="item.warped_image_url">
                    <div class="image-label">污渍区域</div>
                    <el-image
                      :src="item.warped_image_url"
                      :preview-src-list="[item.warped_image_url]"
                      :initial-index="0"
                      preview-teleported
                      hide-on-click-modal
                      fit="cover"
                      class="result-image">
                    </el-image>
                  </div>

                  <div class="arrow-icon">→</div>

                  <div class="processed-image" v-if="item.result_image_url">
                    <div class="image-label">处理结果</div>
                    <el-image
                      :src="item.result_image_url"
                      :preview-src-list="[item.result_image_url]"
                      :initial-index="0"
                      preview-teleported
                      hide-on-click-modal
                      fit="cover"
                      class="result-image">
                    </el-image>
                  </div>

                  <div class="percentage-badge" v-if="item.stain_percentage !== undefined">
                    <el-icon class="percentage-icon"><Warning /></el-icon>
                    <span class="percentage-text">污渍占比</span>
                    <span class="percentage-value">
                      {{ (item.stain_percentage * 100).toFixed(2) }}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<script lang="ts" setup>
import type {TableColumnCtx} from "element-plus";
import {ref, onMounted} from "vue";
import {UploadFilled} from "@element-plus/icons-vue";
import {Upload} from "@element-plus/icons-vue";
import axios from "axios";
import {useRouter} from "vue-router";
import {detectStain} from '../../api/stain';
import { Warning } from '@element-plus/icons-vue'
import { ArrowLeft, Search, Document } from '@element-plus/icons-vue'
import userService from '../../api/user';
import { ElMessage, ElMessageBox } from 'element-plus'
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const router = useRouter();
const backToMain = () => {
  router.push("/");
};

// 添加接口定义
interface DetectionResult {
  annotated_image_url: string;
  warped_image_url: string;
  result_image_url: string;
  stain_percentage: number;
}

interface TableItem {
  warped_image_url: string;
  result_image_url: string;
  stain_percentage: number;
}

const tableData = ref<TableItem[]>([]);
const showTable = ref(false); // 控制是否显示表格的标志

// 定义上传URL和认证数据
const uploadUrl = ref('');
const uploadData = ref({
  userName: 'stain-detection',
  password: 'tongji-icw-3567'
});

const accountId = 13; //暂时写死
const imageUrl = ref(''); // 用于存储上传后的图片路径
const progressPercentage = ref(0); //进度条响应变量

// 添加标注图片URL的响应式变量
const annotatedImageUrl = ref('');

// 添加新的响应式变量
const isUploading = ref(false);
const isProcessing = ref(false);
const uploadProgress = ref(0);

// 添加处理上传进度的函数
const handleUploadProgress = (event: any) => {
  isUploading.value = true;
  uploadProgress.value = Math.round((event.loaded / event.total) * 100);
};

// 添加处理上传错误的函数
const handleUploadError = (error: any) => {
  isUploading.value = false;
  uploadProgress.value = 0;
  ElMessage.error('上传失败，请重试');
  console.error('Upload error:', error);
};

// 修改 handleUploadSuccess 函数
const handleUploadSuccess = async (response: any) => {
  try {
    if (response) {
      isUploading.value = false; // 重置上传状态
      ElMessage.success('上传成功');
      // 新增到图片表
      const imgInfo = {
        url: response,
        name: response.split('/').pop()?.split('-').slice(1).join('-') || '图片',
        uploadTime: new Date().toLocaleString()
      };
      imageList.value.push(imgInfo);
      localStorage.setItem('stainImageList', JSON.stringify(imageList.value));
      // 默认选中最新上传图片
      imageUrl.value = response;
      console.log(imageUrl.value);
    } else {
      ElMessage.error('上传失败：未获取到下载链接');
    }
  } catch (error) {
    console.error('上传处理出错:', error);
    ElMessage.error('上传处理失败，请重试');
  }
};

const handleBeforeUpload = async (file: File) => {
  // 检查文件类型
  const isImage = file.type.startsWith('image/');
  if (!isImage) {
    ElMessage.error('只能上传图片文件!');
    return false;
  }

  // 检查文件大小
  const isLt50M = file.size / 1024 / 1024 < 50;
  if (!isLt50M) {
    ElMessage.error('图片大小不能超过 50MB!');
    return false;
  }

  try {
    // 弹出对话框让用户输入图片名
    const { value: imageName } = await ElMessageBox.prompt('请输入图片名称', '图片名称', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^.{1,50}$/,
      inputErrorMessage: '图片名称长度应在1-50个字符之间',
      inputValue: file.name.split('.')[0], // 默认使用原文件名（不含扩展名）
    });

    // 生成符合规则的文件名
    const timestamp = Date.now();
    const cleanFileName = (imageName || file.name).replace(/[^a-zA-Z0-9.-]/g, '-');

    // 构建上传路径
    uploadUrl.value = `http://8.159.143.133:9000/oss/upload/upload/${timestamp}-${cleanFileName}`;
    ElMessage.info('上传中');

    return true;
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('图片名称输入错误');
    }
    return false;
  }
};

const fetchData = async () => {
  try {
    // 上传图片的检查
    if (!imageUrl.value) {
      ElMessage.warning('请先上传图片');
      return;
    }

    // 获取并检查 token
    const token = localStorage.getItem('authToken');
    console.log('获取到的 token:', token);

    if (!token) {
      ElMessage.warning('请先登录');
      return;
    }

    try {
      // 解码 token，获取 userId
      const { jwtDecode } = await import('jwt-decode');
      const decode = jwtDecode(token);
      console.log('解码后的 token 数据:', decode);

      const userId = decode.username;

      if (!userId) {
        console.error('Token 中未找到用户名:', decode);
        ElMessage.warning('未获取到用户信息，请重新登录');
        localStorage.removeItem('authToken');
        router.push('/login');
        return;
      }

      // 启动处理状态和进度条
      isProcessing.value = true;
      progressPercentage.value = 0;

      const intervalId = setInterval(() => {
        if (progressPercentage.value < 90) {
          progressPercentage.value += 0.5;
        }
      }, 1000);

      // 请求污渍检测数据
      console.log('发送请求参数:', { imageUrl: imageUrl.value, username: userId });

      const result = await detectStain(imageUrl.value, userId);
      console.log('API 响应:', result);

      // 清除进度条定时器，并设置进度条为 100
      clearInterval(intervalId);
      progressPercentage.value = 100;

      // 处理返回结果
      if (result.status === 'success' && result.data && result.data.length > 0) {
        // 找到标注后的图片 URL
        const annotatedImage = result.data.find(item => item.annotated_image_url);
        if (annotatedImage) {
          annotatedImageUrl.value = annotatedImage.annotated_image_url;
        }

        // 过滤并映射污渍检测结果
        tableData.value = result.data
          .filter(item => item.result_image_url && item.warped_image_url)
          .map(item => ({
            warped_image_url: item.warped_image_url,
            result_image_url: item.result_image_url,
            stain_percentage: item.stain_percentage
          }));

        showTable.value = true;
        ElMessage.success('检测完成');
      } else {
        showTable.value = true; // 即使没有检测到污渍也显示结果区域
        tableData.value = []; // 清空数据
        ElMessage.info(result.message || '未检测到污渍');
      }
    } catch (decodeError) {
      console.error('Token 解析失败:', decodeError);
      ElMessage.error('登录信息已过期，请重新登录');
      localStorage.removeItem('authToken');
      router.push('/login');
      return;
    }
  } catch (error) {
    // 处理 API 错误和记录详细信息
    console.error('API 错误详情:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        params: error.config?.params,
        data: error.config?.data
      }
    });
    handleError(error);  // 你可以自定义这个函数来处理错误
  } finally {
    // 无论如何，确保进度条最终设置为100并且停止
    isProcessing.value = false;
    progressPercentage.value = 100;
  }
};


// 增强错误处理函数
const handleError = (error: any) => {
  console.error('处理失败:', error);
  let message = '检测失败，请重试';

  if (error.response?.status === 404) {
    message = 'API 接口不存在，请检查接口地址';
  } else if (error.code === 'ECONNABORTED') {
    message = '检测超时，请重试';
  } else if (error.response?.data?.message) {
    message = `检测失败: ${error.response.data.message}`;
  } else if (error.request) {
    message = '网络连接失败，请检查网络';
  }

  ElMessage.error(message);
  progressPercentage.value = 0;
};

// 添加进度文本获取函数
const getProgressText = () => {
  if (progressPercentage.value === 100) {
    return '处理完成';
  }
  if (progressPercentage.value === 0) {
    return '等待处理';
  }
  return `处理中 ${progressPercentage.value}%`;
};

// 修改PDF导出功能
const exportPDF = async () => {
  if (!tableData.value || tableData.value.length === 0) {
    ElMessage.warning('没有可导出的结果');
    return;
  }

  try {
    ElMessage.info('正在生成PDF，请稍候...');

    // 创建 PDF 实例
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 添加字体
    doc.addFont('/assets/simsun.ttf', 'simsun', 'normal');
    doc.setFont('simsun');

    // 页面高度和宽度
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const imgWidth = 80; // 图片宽度（mm）
    let currentY = 20; // 当前Y坐标

    // 检查是否需要新页面
    const checkNewPage = (contentHeight: number) => {
      if (currentY + contentHeight > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
      }
    };

    // 添加标题函数
    const addTitle = (text: string, level: number = 1) => {
      const fontSize = level === 1 ? 20 : level === 2 ? 16 : 14;
      const marginTop = level === 1 ? 0 : level === 2 ? 3 : 2;
      
      checkNewPage(fontSize + marginTop);
      doc.setFontSize(fontSize);
      const textWidth = doc.getTextWidth(text);
      const x = level === 1 ? (pageWidth - textWidth) / 2 : 20;
      doc.text(text, x, currentY);
      currentY += fontSize + marginTop;
    };

    // 添加内容函数
    const addContent = (text: string, fontSize: number = 12) => {
      checkNewPage(fontSize + 2);
      doc.setFontSize(fontSize);
      doc.text(text, 20, currentY);
      currentY += fontSize + 2;
    };

    // 加载图片函数
    const loadImage = (url: string) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    };

    // 1. 报告标题
    addTitle("污渍检测报告", 1);

    // 2. 用户信息
    addTitle("一、用户信息", 2);
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const { jwtDecode } = await import('jwt-decode');
        const decode = jwtDecode(token);
        addContent(`用户名：${decode.username || '未知'}`);
        addContent(`生成时间：${new Date().toLocaleString('zh-CN')}`);
      } catch (error) {
        console.error('Token解析失败:', error);
        addContent('用户信息获取失败');
      }
    } else {
      addContent('未登录用户');
    }

    // 3. 图片信息
    addTitle("二、图片信息", 2);
    const selectedImage = imageList.value.find(img => img.url === imageUrl.value);
    if (selectedImage) {
      addContent(`图片名称：${selectedImage.name}`);
      addContent(`上传时间：${selectedImage.uploadTime}`);
      addContent(`图片路径：${selectedImage.url}`);
    }

    // 4. 原始图片分析
    if (imageUrl.value && annotatedImageUrl.value) {
      addTitle("三、原始图片分析", 2);

      const originalImg = await loadImage(imageUrl.value);
      const annotatedImg = await loadImage(annotatedImageUrl.value);

      // 计算图片尺寸
      const imgHeight1 = (originalImg.height * imgWidth) / originalImg.width;
      const imgHeight2 = (annotatedImg.height * imgWidth) / annotatedImg.height;

      // 添加原始图片
      addTitle("1. 原始图片", 3);
      checkNewPage(imgHeight1 + 8);
      doc.addImage(originalImg, 'JPEG', 20, currentY, imgWidth, imgHeight1);
      currentY += imgHeight1 + 6;

      // 添加标注图片
      addTitle("2. 标注结果", 3);
      checkNewPage(imgHeight2 + 8);
      doc.addImage(annotatedImg, 'JPEG', 20, currentY, imgWidth, imgHeight2);
      currentY += imgHeight2 + 10;
    }

    // 5. 检测结果
    addTitle("四、检测结果", 2);
    addContent(`共检测到 ${tableData.value.length} 处污渍，具体分析如下：`);

    // 添加每个污渍的检测结果
    for (let i = 0; i < tableData.value.length; i++) {
      const item = tableData.value[i];
      addTitle(`${i + 1}. 第 ${i + 1} 处污渍`, 3);

      // 加载污渍区域图片
      const stainImg = await loadImage(item.warped_image_url);
      const stainImgHeight = (stainImg.height * imgWidth) / stainImg.width;
      
      // 加载处理结果图片
      const resultImg = await loadImage(item.result_image_url);
      const resultImgHeight = (resultImg.height * imgWidth) / resultImg.width;

      // 添加污渍区域图片
      addTitle("(1) 污渍区域", 3);
      checkNewPage(stainImgHeight + 8);
      doc.addImage(stainImg, 'JPEG', 20, currentY, imgWidth, stainImgHeight);
      currentY += stainImgHeight + 6;

      // 添加处理结果图片
      addTitle("(2) 处理结果", 3);
      checkNewPage(resultImgHeight + 8);
      doc.addImage(resultImg, 'JPEG', 20, currentY, imgWidth, resultImgHeight);
      currentY += resultImgHeight + 6;

      // 添加污渍百分比
      addTitle("(3) 污渍分析", 3);
      addContent(`污渍占比：${(item.stain_percentage * 100).toFixed(2)}%`);
      addContent("处理建议：建议及时清理，避免污渍扩散");
      currentY += 3;
    }

    // 6. 总结
    addTitle("五、总结", 2);
    const totalPercentage = tableData.value.reduce((sum, item) => sum + item.stain_percentage, 0);
    const averagePercentage = (totalPercentage / tableData.value.length) * 100;
    addContent(`本次检测共发现 ${tableData.value.length} 处污渍，平均污渍占比 ${averagePercentage.toFixed(2)}%。`);
    addContent("建议及时处理发现的污渍，保持墙面清洁。");

    // 保存 PDF
    doc.save(`污渍检测报告-${new Date().getTime()}.pdf`);
    ElMessage.success('PDF导出成功');
  } catch (error) {
    console.error('PDF导出错误:', error);
    ElMessage.error('PDF导出失败，请重试');
  }
};

const imageList = ref<{ url: string, name: string, uploadTime: string }[]>([]);

onMounted(() => {
  const saved = localStorage.getItem('stainImageList');
  if (saved) imageList.value = JSON.parse(saved);
});

const selectImage = (url: string) => {
  imageUrl.value = url;
  ElMessage({
    message: '已选择图片进行检测',
    type: 'success',
    duration: 2000,
    showClose: true
  });
};

const deleteImage = (index: number) => {
  const delUrl = imageList.value[index].url;
  imageList.value.splice(index, 1);
  localStorage.setItem('stainImageList', JSON.stringify(imageList.value));
  ElMessage.success('图片已删除');
  // 如果删除的是当前检测图片，清空 imageUrl
  if (imageUrl.value === delUrl) {
    imageUrl.value = '';
  }
};

const tableRowClassName = ({ row }: { row: { url: string } }) => {
  return row.url === imageUrl.value ? 'selected-row' : '';
};

</script>

<style scoped>
/* 修改容器相关样式 */
.page-wrapper {
  position: fixed;
  top: 0;
  left: 200px;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.main-container {
  height: 100%;
  width: 100%;
  overflow-y: auto;
  padding: 20px;
  background-color: #f5f7fa;
}

/* 修改上传区域样式 */
.upload-container {
  width: 1200px; /* 与结果区域同宽 */
  max-width: 100%; /* 确保在小屏幕上不会溢出 */
  margin: 0 auto;
  padding: 40px;
  background: white;
  border: 2px dashed #409EFF;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 30px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.upload-container:hover {
  border-color: #79bbff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.1);
}

.upload-container.is-uploading {
  border-color: #409EFF;
  background: #f5f7fa;
}

.upload-demo {
  width: 100%;
}

.upload-demo .el-icon--upload {
  font-size: 56px;
  color: #409EFF;
  transition: all 0.3s ease;
}

.upload-demo .el-upload__text {
  margin-top: 16px;
  font-size: 16px;
  color: #606266;
}

.upload-demo .el-upload__text em {
  color: #409EFF;
  font-style: normal;
  font-weight: 500;
}

.upload-demo .el-upload__tip {
  margin-top: 12px;
  font-size: 13px;
  color: #909399;
}

/* 修改操作栏样式 */
.action-bar {
  width: 1200px; /* 与上传框同宽 */
  max-width: 100%;
  margin: 20px auto;
  display: flex;
  align-items: center;
  gap: 20px;
}

/* 修改进度条容器样式 */
.progress-wrapper {
  flex: 1;
  margin-left: 24px;
  padding: 0 12px;
}

/* 修改结果展示区域样式 */
.results-section {
  width: 100%;
  max-width: 1200px;  /* 限制最大宽度 */
  margin: 0 auto;
  padding: 20px 0;
}

/* 修改图片比较区域样式 */
.image-comparison {
  display: flex;
  gap: 30px; /* 增加间距 */
  margin-bottom: 30px;
  width: 100%;
}

.image-box {
  flex: 1;
  min-width: 0; /* 防止图片溢出 */
}

/* 修改结果墙样式 */
.results-wall {
  display: flex;
  flex-direction: column;
  gap: 30px;
  padding: 20px 0;
}

.result-item {
  background: white;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  width: 100%;
}

.result-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.image-pair {
  display: flex;
  align-items: center;
  gap: 40px;
  position: relative;
}

.stain-image,
.processed-image {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-label {
  font-size: 15px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 16px;
  position: relative;
  padding-bottom: 8px;
}

.image-label::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 2px;
  background: #409EFF;
  border-radius: 2px;
}

.result-image {
  width: 100%;
  height: 300px;
  object-fit: contain;
  border-radius: 8px;
  background: white;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

/* 优化箭头样式 */
.arrow-icon {
  font-size: 28px;
  color: #409EFF;
  margin: 0 20px;
  animation: pulse 2s infinite;
  position: relative;
}

.arrow-icon::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 50%;
  z-index: -1;
}

/* 其他样式保持不变... */

/* 优化结果展示区域样式 */
.section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 24px;
  padding-left: 12px;
  border-left: 4px solid #409EFF;
}

/* 优化结果项样式 */
.result-item {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.result-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.image-pair {
  display: flex;
  align-items: center;
  gap: 24px;
  position: relative;
}

.stain-image,
.processed-image {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-label {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 12px;
}

.result-image {
  width: 100%;
  height: 240px;
  object-fit: cover;
}

.arrow-icon {
  font-size: 24px;
  color: #409EFF;
  margin: 0 12px;
  animation: pulse 2s infinite;
}

/* 优化污渍百分比标签样式 */
.percentage-badge {
  position: absolute;
  top: -15px;
  right: -15px;
  background: linear-gradient(135deg, #409EFF, #36D1DC);
  padding: 10px 16px;
  border-radius: 20px;
  color: white;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.percentage-badge:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.3);
}

.percentage-icon {
  font-size: 16px;
  animation: pulse 2s infinite;
}

.percentage-text {
  font-size: 12px;
  opacity: 0.9;
}

.percentage-value {
  font-size: 14px;
  font-weight: 600;
}

/* 添加动画效果 */
@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}

/* 优化图片预览样式 */
:deep(.el-image-viewer__wrapper) {
  backdrop-filter: blur(10px);
}

:deep(.el-image-viewer__close) {
  color: white;
}

/* 修改响应式布局 */
@media screen and (max-width: 1400px) {
  .image-pair {
    gap: 24px;
  }

  .result-image {
    height: 240px;
  }
}

@media screen and (max-width: 768px) {
  .upload-container {
    width: 100%;
    max-width: 500px;
  }

  .action-bar {
    width: 100%;
    max-width: 500px;
  }

  .image-pair {
    flex-direction: column;
  }

  .arrow-icon {
    transform: rotate(90deg);
    margin: 20px 0;
  }

  .result-image {
    height: 200px;
  }
}

/* 修改顶部导航栏样式 */
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

/* 修改返回按钮样式 */
.back-button {
  min-width: 120px;
  height: 40px;
  font-size: 15px;
  font-weight: 500;
  padding: 0 24px;
  border-radius: 8px;
  background: linear-gradient(135deg, #409EFF, #36D1DC);
  border: none;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-button:hover {
  transform: translateX(-3px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  background: linear-gradient(135deg, #66b1ff, #40E0D0);
}

.back-button .el-icon {
  font-size: 18px;
  margin-right: 4px;
}

/* 修改按钮样式 */
.detect-button {
  min-width: 120px;
  height: 40px;
  font-size: 15px;
  font-weight: 500;
  padding: 0 24px;
  border-radius: 8px;
  background: linear-gradient(135deg, #409EFF, #36D1DC);
  border: none;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detect-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  background: linear-gradient(135deg, #66b1ff, #40E0D0);
}

.detect-button:disabled {
  background: #a0cfff;
  cursor: not-allowed;
  border: none;
}

.detect-button .el-icon {
  font-size: 18px;
  margin-right: 4px;
}

/* 优化进度条样式 */
:deep(.el-progress-bar__outer) {
  border-radius: 8px;
  background-color: #e6f1ff;
}

:deep(.el-progress-bar__inner) {
  border-radius: 8px;
  background: linear-gradient(90deg, #409EFF, #36D1DC);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
  display: block;
}

.export-button {
  min-width: 120px;
  height: 40px;
  font-size: 15px;
  font-weight: 500;
  padding: 0 24px;
  border-radius: 8px;
  background: linear-gradient(135deg, #67C23A, #95D475);
  border: none;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
}

.export-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);
  background: linear-gradient(135deg, #85CE61, #A8E986);
}

.export-button:disabled {
  background: #B3E19D;
  cursor: not-allowed;
  border: none;
}

.export-button .el-icon {
  font-size: 18px;
  margin-right: 4px;
}

.export-pdf-button {
  min-width: 120px;
  height: 40px;
  font-size: 15px;
  font-weight: 500;
  padding: 0 24px;
  border-radius: 8px;
  background: linear-gradient(135deg, #E6A23C, #F5C77E);
  border: none;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
}

.export-pdf-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(230, 162, 60, 0.3);
  background: linear-gradient(135deg, #EFB755, #F8D399);
}

.export-pdf-button:disabled {
  background: #F3D19E;
  cursor: not-allowed;
  border: none;
}

.export-pdf-button .el-icon {
  font-size: 18px;
  margin-right: 4px;
}

:deep(.selected-row) {
  background-color: #f0f9ff !important;
}
:deep(.selected-row:hover > td) {
  background-color: #e6f7ff !important;
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-table__header) {
  background-color: #f5f7fa;
}

:deep(.el-table__row) {
  transition: all 0.3s;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

:deep(.el-table__cell) {
  padding: 12px 0;
}
</style>