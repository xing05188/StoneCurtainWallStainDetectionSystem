<script setup>
import { Picture } from '@element-plus/icons-vue'

// 添加打开数据集链接的函数
const openDataset = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}

// 数据集链接配置
const datasets = {
  crack500: 'https://github.com/fyangneil/pavement-crack-detection',
  cfd: 'https://github.com/cuilimeng/CrackForest-dataset',
  eugenMuller: 'https://doi.org/10.5281/zenodo.4501609',
  crackTree: 'https://github.com/example/cracktree',
  deepCrack: 'https://github.com/example/deepcrack',
  forest: 'https://github.com/example/forest',
  gaps384: 'https://github.com/example/gaps384',
  noncrackConcrete: 'https://github.com/example/noncrack',
  rissbilder: 'https://github.com/example/rissbilder',
  sylvieChambon: 'https://github.com/example/sylvie',
  volkerDsc: 'https://github.com/example/volker'
}
</script>

<template>
  <div class="container">
    <div class="header">
      <h1 class="main-title">石材裂缝共享数据集</h1>
      <p class="subtitle">共享开创智慧幕墙</p>
      <div class="dataset-total">
        总训练集大小：11298
      </div>
    </div>

    <div class="datasets-grid">
      <!-- 原有的三个数据集 -->
      <el-card class="dataset-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>Crack500</h2>
            <el-button 
              type="primary" 
              @click="openDataset(datasets.crack500)"
            >
              访问数据集
            </el-button>
          </div>
        </template>
        <div class="card-content">
          <div class="dataset-info">
            <p>包含500张带有精细标注的裂缝图像</p>
            <p>图像分辨率：2000×1500像素</p>
            <p>适用于道路和建筑表面裂缝检测</p>
          </div>
        </div>
      </el-card>

      <el-card class="dataset-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>CFD</h2>
            <el-button 
              type="primary" 
              @click="openDataset(datasets.cfd)"
            >
              访问数据集
            </el-button>
          </div>
        </template>
        <div class="card-content">
          <div class="dataset-info">
            <p>包含118张带有像素级标注的裂缝图像</p>
            <p>图像分辨率：480×320像素</p>
            <p>专注于混凝土表面裂缝检测</p>
          </div>
        </div>
      </el-card>

      <el-card class="dataset-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>Eugen_Muller</h2>
            <el-button 
              type="primary" 
              @click="openDataset(datasets.eugenMuller)"
            >
              访问数据集
            </el-button>
          </div>
        </template>
        <div class="card-content">
          <div class="dataset-info">
            <p>包含600张高质量裂缝图像</p>
            <p>图像分辨率：多种分辨率</p>
            <p>适用于建筑结构裂缝检测研究</p>
          </div>
        </div>
      </el-card>

      <!-- 新增数据集 -->
      <el-card class="dataset-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>CrackTree</h2>
            <el-button 
              type="primary" 
              @click="openDataset(datasets.crackTree)"
            >
              访问数据集
            </el-button>
          </div>
        </template>
        <div class="card-content">
          <div class="dataset-info">
            <p>专注于道路裂缝检测的数据集</p>
            <p>包含树状结构的裂缝标注</p>
            <p>适用于复杂裂缝形态分析</p>
          </div>
        </div>
      </el-card>

      <el-card class="dataset-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>DeepCrack</h2>
            <el-button 
              type="primary" 
              @click="openDataset(datasets.deepCrack)"
            >
              访问数据集
            </el-button>
          </div>
        </template>
        <div class="card-content">
          <div class="dataset-info">
            <p>深度学习专用裂缝数据集</p>
            <p>包含精确的像素级标注</p>
            <p>适用于深度学习模型训练</p>
          </div>
        </div>
      </el-card>

      <el-card class="dataset-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>Forest</h2>
            <el-button 
              type="primary" 
              @click="openDataset(datasets.forest)"
            >
              访问数据集
            </el-button>
          </div>
        </template>
        <div class="card-content">
          <div class="dataset-info">
            <p>森林算法优化的裂缝数据集</p>
            <p>包含多样化的裂缝形态</p>
            <p>适用于机器学习模型训练</p>
          </div>
        </div>
      </el-card>

      <el-card class="dataset-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>GAPS384</h2>
            <el-button 
              type="primary" 
              @click="openDataset(datasets.gaps384)"
            >
              访问数据集
            </el-button>
          </div>
        </template>
        <div class="card-content">
          <div class="dataset-info">
            <p>包含384张高质量裂缝图像</p>
            <p>标准化的图像采集流程</p>
            <p>适用于裂缝检测算法验证</p>
          </div>
        </div>
      </el-card>

      <el-card class="dataset-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>Noncrack Concrete</h2>
            <el-button 
              type="primary" 
              @click="openDataset(datasets.noncrackConcrete)"
            >
              访问数据集
            </el-button>
          </div>
        </template>
        <div class="card-content">
          <div class="dataset-info">
            <p>无裂缝混凝土表面数据集</p>
            <p>用于减少误检率</p>
            <p>提高模型鲁棒性</p>
          </div>
        </div>
      </el-card>

      <el-card class="dataset-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>Rissbilder for Florian</h2>
            <el-button 
              type="primary" 
              @click="openDataset(datasets.rissbilder)"
            >
              访问数据集
            </el-button>
          </div>
        </template>
        <div class="card-content">
          <div class="dataset-info">
            <p>德国工程研究数据集</p>
            <p>包含多种工程环境下的裂缝</p>
            <p>适用于工程实践研究</p>
          </div>
        </div>
      </el-card>

      <el-card class="dataset-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>Sylvie Chambon</h2>
            <el-button 
              type="primary" 
              @click="openDataset(datasets.sylvieChambon)"
            >
              访问数据集
            </el-button>
          </div>
        </template>
        <div class="card-content">
          <div class="dataset-info">
            <p>法国研究团队公开数据集</p>
            <p>包含多种光照条件下的裂缝</p>
            <p>适用于鲁棒性研究</p>
          </div>
        </div>
      </el-card>

      <el-card class="dataset-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h2>Volker DSC</h2>
            <el-button 
              type="primary" 
              @click="openDataset(datasets.volkerDsc)"
            >
              访问数据集
            </el-button>
          </div>
        </template>
        <div class="card-content">
          <div class="dataset-info">
            <p>数字图像处理专用数据集</p>
            <p>包含标准化的图像处理流程</p>
            <p>适用于算法开发和测试</p>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.container {
  padding: 40px;
  background-color: #F5F7FA;
  height: 100vh;
  overflow-y: auto;
  box-sizing: border-box;
}

.header {
  text-align: center;
  margin-bottom: 40px;
  position: sticky;
  top: 0;
  background-color: #F5F7FA;
  padding: 20px 0;
  z-index: 1;
}

.main-title {
  font-size: 36px;
  color: #303133;
  margin-bottom: 16px;
}

.subtitle {
  font-size: 18px;
  color: #606266;
  margin: 0;
}

.datasets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 40px;
}

.dataset-card {
  transition: transform 0.3s ease;
}

.dataset-card:hover {
  transform: translateY(-5px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.dataset-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 4px;
}

.dataset-info {
  color: #606266;
  padding: 10px;
}

.dataset-info p {
  margin: 8px 0;
  line-height: 1.6;
}

:deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #EBEEF5;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-button--primary) {
  background-color: #1989FA;
  border-color: #1989FA;
}

:deep(.el-button--primary:hover) {
  background-color: #409EFF;
  border-color: #409EFF;
}

.image-placeholder {
  width: 100%;
  height: 200px;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
  border-radius: 4px;
}

.image-placeholder .el-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.dataset-total {
  font-size: 24px;
  color: #409EFF;
  margin-top: 20px;
  font-weight: bold;
}

/* 优化滚动行为 */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style> 