<template>
    <el-card shadow="hover" class="status-card" :style="`--card-color: ${color}`">
      <div class="card-content">
        <div class="card-icon">
          <el-icon :size="36">
            <component :is="icon" />
          </el-icon>
        </div>
        <div class="card-info">
          <h3>{{ title }}</h3>
          <div class="status-indicator">
            <el-tag :type="getStatusTag(status)" size="small" effect="dark">
              {{ getStatusText(status) }}
            </el-tag>
          </div>
          <div class="service-counts">
            <div class="count-item">
              <span class="count running">{{ count.running || 0 }}</span>
              <span class="count-label">运行中</span>
            </div>
            <div class="count-item">
              <span class="count warning">{{ count.warning || 0 }}</span>
              <span class="count-label">警告</span>
            </div>
            <div class="count-item">
              <span class="count down">{{ count.down || 0 }}</span>
              <span class="count-label">停止</span>
            </div>
            <div class="count-item total">
              <span class="count">{{ count.total || 0 }}</span>
              <span class="count-label">总数</span>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </template>
  
  <script setup>
  import { defineProps } from 'vue'
  
  const props = defineProps({
    title: String,
    status: String,
    count: Object,
    icon: String,
    color: {
      type: String,
      default: '#409EFF'
    }
  })
  
  const getStatusTag = (status) => {
    return {
      healthy: 'success',
      warning: 'warning',
      error: 'danger'
    }[status] || 'info'
  }
  
  const getStatusText = (status) => {
    return {
      healthy: '健康',
      warning: '警告',
      error: '异常'
    }[status] || status
  }
  </script>
  
  <style scoped lang="scss">
  .status-card {
    border-top: 3px solid var(--card-color);
    height: 100%;
    
    .card-content {
      display: flex;
      gap: 16px;
      height: 100%;
      
      .card-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 60px;
        height: 60px;
        border-radius: 8px;
        background-color: rgba(var(--card-color), 0.1);
        color: var(--card-color);
      }
      
      .card-info {
        flex: 1;
        
        h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
          color: #333;
        }
        
        .status-indicator {
          margin-bottom: 12px;
        }
        
        .service-counts {
          display: flex;
          gap: 8px;
          
          .count-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 4px 8px;
            border-radius: 4px;
            background-color: #f5f7fa;
            
            &.total {
              margin-left: auto;
              background-color: transparent;
              border-left: 1px solid #e6e8eb;
            }
            
            .count {
              font-weight: 600;
              font-size: 16px;
              
              &.running {
                color: #67c23a;
              }
              
              &.warning {
                color: #e6a23c;
              }
              
              &.down {
                color: #f56c6c;
              }
            }
            
            .count-label {
              font-size: 12px;
              color: #909399;
            }
          }
        }
      }
    }
  }
  </style>