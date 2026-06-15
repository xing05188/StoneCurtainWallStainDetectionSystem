<template>
    <el-card shadow="hover" class="statistic-card" :body-style="{ padding: '20px' }">
      <div class="card-content">
        <div class="card-icon">
          <el-icon :size="36">
            <component :is="icon" />
          </el-icon>
        </div>
        <div class="card-text">
          <div class="card-title">{{ title }}</div>
          <div class="card-value">{{ value }}</div>
        </div>
      </div>
    </el-card>
  </template>
  
  <script setup>
  defineProps({
    title: {
      type: String,
      required: true
    },
    value: {
      type: [String, Number],
      required: true
    },
    icon: {
      type: String,
      default: 'tickets'
    }
  })
  </script>
  
  <style scoped lang="scss">
  .statistic-card {
    margin-bottom: 0;
    border-radius: 8px;
    border: none;
    
    .card-content {
      display: flex;
      align-items: center;
      
      .card-icon {
        margin-right: 16px;
        color: var(--el-color-primary);
      }
      
      .card-text {
        flex: 1;
        
        .card-title {
          font-size: 14px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .card-value {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
      }
    }
    
    &:hover {
      transform: translateY(-2px);
      transition: all 0.3s ease;
    }
  }
  </style>