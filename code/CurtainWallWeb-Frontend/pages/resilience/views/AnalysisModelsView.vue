<template>
  <div class="model-container">
    <!-- 标题和操作区 -->
    <div class="model-header">
      <h2>模型列表管理</h2>
      <div class="action-buttons">
        <el-button type="primary" @click="showCreateDialog" size="large" class="primary-btn">
          <el-icon><plus /></el-icon>
          <span>创建模型</span>
        </el-button>
      </div>
    </div>

    <!-- 创建模型对话框 -->
    <el-dialog v-model="dialogCreateVisible" title="创建模型" width="600px" class="custom-dialog">
      <el-form :model="form" label-width="120px" :rules="rules" class="form-container">
        <el-form-item label="模型名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="分析维度" prop="dimension">
          <el-select v-model="form.dimension" placeholder="请选择分析维度" @change="handleDimensionChange">
            <el-option label="结构韧性" value="structural" />
            <el-option label="几何/安装精度韧性" value="geometric" />
            <el-option label="损伤韧性" value="damage" />
            <el-option label="耐久与视觉韧性" value="visual" />
            <el-option label="综合韧性" value="overall" />
          </el-select>
        </el-form-item>
        <el-form-item label="方法" prop="method">
          <el-select v-model="form.method" placeholder="请选择方法" @change="handleMethodChange">
            <el-option
              v-for="item in methodOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <div class="form-hint" style="font-size: 12px; color: #999; margin-top: 4px; margin-left: 120px;">
          注意：分析维度和方法一旦创建后将不可修改
        </div>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>
        <el-form-item label="参数配置" prop="parameters">
          <el-button @click="openParamDialog" type="primary" class="param-btn">点击配置</el-button>
          <div class="form-hint" style="font-size: 12px; color: #999; margin-top: 4px; margin-left: 20px;">
            注意：参数配置若为空，则采用默认推荐配置
          </div>
        </el-form-item>
        <el-dialog 
          v-model="paramDialogVisible" 
          :title="`参数配置 - ${currentMethodName}`" 
          width="700px"
          class="param-config-dialog"
        >
          <el-form :model="form.parameters" label-width="140px" label-position="left" class="param-form">
            <el-scrollbar height="500px">
              <el-form-item
                v-for="item in currentParamConfig"
                :key="item.prop"
                :label="item.label"
                :prop="item.prop"
              >
                <!-- 输入框 -->
                <template v-if="item.type === 'input'">
                  <el-input 
                    v-model="form.parameters[item.prop]" 
                    :placeholder="item.placeholder || ''"
                    clearable
                  />
                  <div class="param-tip" v-if="item.tip">{{ item.tip }}</div>
                </template>

                <!-- 下拉选择 -->
                <template v-else-if="item.type === 'select'">
                  <el-select 
                    v-model="form.parameters[item.prop]" 
                    placeholder="请选择"
                    style="width: 100%"
                  >
                    <el-option 
                      v-for="opt in item.options" 
                      :key="opt.value || opt" 
                      :label="opt.label || opt" 
                      :value="opt.value || opt"
                    />
                  </el-select>
                </template>

                <!-- 多选 -->
                <template v-else-if="item.type === 'multi-select'">
                  <el-select 
                    v-model="form.parameters[item.prop]" 
                    multiple 
                    placeholder="请选择"
                    style="width: 100%"
                  >
                    <el-option 
                      v-for="opt in item.options" 
                      :key="opt" 
                      :label="opt" 
                      :value="opt"
                    />
                  </el-select>
                </template>

                <!-- 滑块 -->
                <template v-else-if="item.type === 'slider'">
                  <div class="slider-container">
                    <el-slider
                      v-model="form.parameters[item.prop]"
                      :min="item.min"
                      :max="item.max"
                      :step="item.step"
                      style="flex: 1; margin-right: 20px"
                    />
                    <el-input-number
                      v-model="form.parameters[item.prop]"
                      :min="item.min"
                      :max="item.max"
                      :step="item.step"
                      controls-position="right"
                      style="width: 100px"
                    />
                  </div>
                  <div class="param-tip" v-if="item.tip">{{ item.tip }}</div>
                </template>

                <!-- 单选框 -->
                <template v-else-if="item.type === 'radio'">
                  <el-radio-group v-model="form.parameters[item.prop]" class="radio-group">
                    <el-radio
                      v-for="opt in item.options"
                      :key="opt.value"
                      :label="opt.value"
                    >
                      {{ opt.label }}
                    </el-radio>
                  </el-radio-group>
                </template>

                <!-- 开关 -->
                <template v-else-if="item.type === 'switch'">
                  <el-switch v-model="form.parameters[item.prop]" />
                </template>

                <!-- 动态输入框（用于理想值配置） -->
                <template v-else-if="item.type === 'dynamic-input'">
                  <div v-for="field in item.fields" :key="field.prop" class="dynamic-field">
                    <el-form-item :label="field.label" :prop="field.prop" label-width="220px">
                      <el-input-number
                        v-model="form.parameters[item.prop][field.prop]"
                        :placeholder="field.placeholder || ''"
                        controls-position="right"
                        style="width: 150px"
                      />
                    </el-form-item>
                  </div>
                  <div class="param-tip" v-if="item.tip">{{ item.tip }}</div>
                </template>
              </el-form-item>
            </el-scrollbar>
          </el-form>

          <template #footer>
            <span class="dialog-footer">
              <el-button @click="paramDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="saveParamConfig">保存配置</el-button>
              <el-button v-if="hasDefaultValues" @click="resetToDefault">恢复默认</el-button>
            </span>
          </template>
        </el-dialog>
      </el-form>


      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogCreateVisible = false">取消</el-button>
          <el-button type="primary" @click="createModel">创建</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 模型列表 -->
    <div class="model-list-container">
      <el-card shadow="hover" class="model-card">
        <div class="filter-bar">
          <el-input
            v-model="filters.searchQuery"
            placeholder="搜索模型名称或描述"
            clearable
            style="width: 300px"
            @input="applyFilters"
            @keyup.enter="applyFilters"
          >
            <template #prefix>
              <el-icon><search /></el-icon>
            </template>
          </el-input>
          
          <div class="filter-actions">
            <el-select
              v-model="filters.dimension"
              placeholder="选择分析维度"
              clearable
              style="width: 150px;"
              @change="handleDimensionChange"
            >
              <el-option label="结构韧性" value="structural" />
              <el-option label="几何/安装精度韧性" value="geometric" />
              <el-option label="损伤韧性" value="damage" />
              <el-option label="耐久与视觉韧性" value="visual" />
              <el-option label="综合韧性" value="overall" />
            </el-select>

            <!-- 方法选择器（动态选项） -->
            <el-select
              v-model="filters.method"
              placeholder="选择方法"
              clearable
              style="width: 150px;"
              :disabled="!filters.dimension"
              @change="applyFilters"
            >
              <el-option
                v-for="method in methodOptions"
                :key="method.value"
                :label="method.label"
                :value="method.value"
              />
            </el-select>

            <el-select
              v-model="filters.sortField"
              placeholder="排序方式"
              clearable
              style="width: 120px;"
              @change="applyFilters"
            >
              <el-option label="按模型名称" value="name" />
              <el-option label="按创建时间" value="created_at" />
              <el-option label="按更新时间" value="updated_at" />
            </el-select>

            <el-button @click="toggleSortOrder" class="sort-btn">
              <el-icon>
                <sort v-if="!filters.sortField" />
                <sort-up v-else-if="filters.sortOrder === 'asc'" />
                <sort-down v-else />
              </el-icon>
              {{ filters.sortOrder === 'asc' ? '升序' : '降序' }}
            </el-button>

            <el-button type="info" plain @click="resetFilters" class="reset-btn">
              <el-icon><refresh /></el-icon>
              <span>重置筛选</span>
            </el-button>
            <el-button type="info" plain @click="refreshList" class="refresh-btn">
              <el-icon><refresh /></el-icon>
              <span>刷新</span>
            </el-button>
          </div>
        </div>


        <el-table
          :data="modelList"
          style="width: 100%"
          v-loading="loading"
          row-key="id"
          class="model-table"
        >
          <el-table-column prop="name" label="模型名称" width="200">
            <template #default="{ row }">
              <div class="model-name-cell">
                <el-icon><document /></el-icon>
                <span class="name-text">{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="维度/方法" width="220">
            <template #default="{ row }">
              <div class="dimension-method-cell">
                <!-- 维度标签 -->
                <el-tag 
                  :type="getDimensionTagType(row.dimension)" 
                  size="small"
                  class="dimension-tag"
                >
                  {{ getDimensionText(row.dimension) }}
                </el-tag>
                
                <!-- 方法标签 -->
                <el-tag
                  :type="getMethodTagType(row.method)"
                  :color="getMethodTagColor(row.method)"
                  effect="dark"
                  size="small"
                  class="method-tag"
                >
                  {{ getMethodText(row.method) }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
        
          <el-table-column prop="description" label="描述" width="200" />
          
          <el-table-column prop="created_at" label="创建时间" width="176">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          
          <el-table-column prop="updated_at" label="更新时间" width="176">
            <template #default="{ row }">
              {{ row.updated_at ? formatDateTime(row.updated_at) : '-' }}
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button 
                size="small" 
                @click.stop="editModel(row)"
                class="edit-btn"
              >
                <el-icon><edit /></el-icon>
                <span>编辑</span>
              </el-button>
              <el-button 
                size="small" 
                type="danger" 
                @click.stop="handleDelete(row)"
                class="delete-btn"
              >
                <el-icon><delete /></el-icon>
                <span>删除</span>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="totalModels"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>
    </div>

    <!--模型编辑对话框-->
    <el-dialog
      v-model="dialogModifyVisible"
      title="编辑模型"
      width="50%"
      @close="handleEditDialogClose"
      class="custom-dialog"
    >
      <el-form :model="form" label-width="120px" class="form-container">
        <el-form-item label="模型名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>
        <el-form-item label="参数配置">
          <el-button @click="openEditParamDialog(selectedModel)" type="primary" class="param-btn">编辑参数</el-button>
        </el-form-item>
        <el-dialog 
          v-model="paramEditDialogVisible" 
          :title="`参数配置 - ${currentMethodName}`" 
          width="700px"
          class="param-config-dialog"
        >
          <el-form :model="form.parameters" label-width="140px" label-position="left" class="param-form">
            <el-scrollbar height="500px">
              <el-form-item
                v-for="item in currentParamConfig"
                :key="item.prop"
                :label="item.label"
                :prop="item.prop"
              >
                <!-- 输入框 -->
                <template v-if="item.type === 'input'">
                  <el-input 
                    v-model="form.parameters[item.prop]" 
                    :placeholder="item.placeholder || ''"
                    clearable
                  />
                  <div class="param-tip" v-if="item.tip">{{ item.tip }}</div>
                </template>

                <!-- 下拉选择 -->
                <template v-else-if="item.type === 'select'">
                  <el-select 
                    v-model="form.parameters[item.prop]" 
                    placeholder="请选择"
                    style="width: 100%"
                  >
                    <el-option 
                      v-for="opt in item.options" 
                      :key="opt.value || opt" 
                      :label="opt.label || opt" 
                      :value="opt.value || opt"
                    />
                  </el-select>
                </template>

                <!-- 多选 -->
                <template v-else-if="item.type === 'multi-select'">
                  <el-select 
                    v-model="form.parameters[item.prop]" 
                    multiple 
                    placeholder="请选择"
                    style="width: 100%"
                  >
                    <el-option 
                      v-for="opt in item.options" 
                      :key="opt" 
                      :label="opt" 
                      :value="opt"
                    />
                  </el-select>
                </template>

                <!-- 滑块 -->
                <template v-else-if="item.type === 'slider'">
                  <div class="slider-container">
                    <el-slider
                      v-model="form.parameters[item.prop]"
                      :min="item.min"
                      :max="item.max"
                      :step="item.step"
                      style="flex: 1; margin-right: 20px"
                    />
                    <el-input-number
                      v-model="form.parameters[item.prop]"
                      :min="item.min"
                      :max="item.max"
                      :step="item.step"
                      controls-position="right"
                      style="width: 100px"
                    />
                  </div>
                  <div class="param-tip" v-if="item.tip">{{ item.tip }}</div>
                </template>

                <!-- 单选框 -->
                <template v-else-if="item.type === 'radio'">
                  <el-radio-group v-model="form.parameters[item.prop]" class="radio-group">
                    <el-radio
                      v-for="opt in item.options"
                      :key="opt.value"
                      :label="opt.value"
                    >
                      {{ opt.label }}
                    </el-radio>
                  </el-radio-group>
                </template>

                <!-- 开关 -->
                <template v-else-if="item.type === 'switch'">
                  <el-switch v-model="form.parameters[item.prop]" />
                </template>

                <!-- 动态输入框（用于理想值配置） -->
                <template v-else-if="item.type === 'dynamic-input'">
                  <div v-for="field in item.fields" :key="field.prop" class="dynamic-field">
                    <el-form-item :label="field.label" :prop="field.prop" label-width="220px">
                      <el-input-number
                        v-model="form.parameters[item.prop][field.prop]"
                        :placeholder="field.placeholder || ''"
                        controls-position="right"
                        style="width: 150px"
                      />
                    </el-form-item>
                  </div>
                  <div class="param-tip" v-if="item.tip">{{ item.tip }}</div>
                </template>
              </el-form-item>
            </el-scrollbar>
          </el-form>

          <template #footer>
            <span class="dialog-footer">
              <el-button @click="paramEditDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="saveParamConfig">保存配置</el-button>
              <el-button v-if="hasDefaultValues" @click="resetToDefault">恢复默认</el-button>
            </span>
          </template>
        </el-dialog>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogModifyVisible = false">取消</el-button>
          <el-button type="primary" @click="saveModel">修改</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { formatDateTime } from '../utils/format'
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiUrl } from '../config'
import {
  Plus,
  Edit,
  Document,
  Delete,
  Search,
  Refresh,
  Sort,
  SortUp,
  SortDown
} from '@element-plus/icons-vue'

// 数据状态
const modelList = ref([])
const pageSize = ref(10)
const dialogCreateVisible = ref(false)
const dialogModifyVisible = ref(false)
const paramDialogVisible = ref(false)
const paramEditDialogVisible = ref(false)
const loading = ref(false)
const selectedModel = ref(null)
const currentPage = ref(1)
const totalModels = ref(0)

const rules = {
  name: [
    { required: true, message: '请输入模型名称', trigger: 'blur' }
  ],
  dimension: [
    { required: true, message: '请选择分析维度', trigger: 'blur' }
  ],
  method: [
    { required: true, message: '请选择分析方法', trigger: 'blur' }
  ]
}

// 维度显示映射
const getDimensionText = (dimension: string | number) => {
  const map = {
    structural: '结构韧性',
    geometric: '几何精度',
    damage: '损伤韧性', 
    visual: '视觉耐久',
    overall: '综合评估'
  }
  return map[dimension] || dimension
}

// 维度标签类型
const getDimensionTagType = (dimension) => {
  const map = {
    structural: '',
    geometric: 'info',
    damage: 'warning',
    visual: 'success',
    overall: 'danger'
  }
  return map[dimension] || ''
}

// 方法标签颜色
const getMethodTagColor = (method) => {
  const colorMap = {
    entropy: '#409EFF',
    topsis: '#67C23A',
    fuzzy: '#E6A23C',
    grey_fuzzy: '#F56C6C',
    error: '#909399'
  }
  return colorMap[method]
}


// 筛选部分
const filters = ref({
  searchQuery: '',      // 搜索关键词
  dimension: '',        // 维度筛选
  method: '',           // 方法筛选
  sortField: '',        // 排序字段
  sortOrder: 'asc'      // 排序方向
})

// 重置所有筛选
const resetFilters = () => {
  filters.value = {
    searchQuery: '',
    dimension: '',
    method: '',
    sortField: '',
    sortOrder: 'asc'
  }
  applyFilters()
}

// 切换排序方向
const toggleSortOrder = () => {
  filters.value.sortOrder = filters.value.sortOrder === 'asc' ? 'desc' : 'asc'
  fetchModels()
}

const form = ref({
  id: null,
  name: '',
  dimension: '',
  method: '',
  version: '',
  description: '',
  applicable_resilience_types: [],
  parameters: {}
})


// 所有维度对应的方法选项
const allMethods = {
  structural: [
    { label: '灰色关联度法', value: 'grey_fuzzy' },
    { label: '熵权法', value: 'entropy' },
    { label: 'TOPSIS法', value: 'topsis' },
    { label: '模糊综合评价', value: 'fuzzy' }
  ],
  geometric: [
    { label: '精度综合评价', value: 'composite' },
    { label: '模糊综合评价', value: 'fuzzy' },
    { label: '误差分析法', value: 'error' }
  ],
  damage: [
    { label: '模糊VIKOR法', value: 'fuzzy_vikor' },
    { label: '状态转移分析', value: 'state_transition' },
    { label: 'AHP层次分析法', value: 'ahp' }
  ],
  visual: [
    { label: '缺陷检测法', value: 'defect_analysis' },
    { label: '专家赋权法', value: 'expert' },
    { label: '模糊综合评价', value: 'fuzzy' }
  ],
  overall: [
    { label: '综合评分', value: 'composite' },
    { label: 'VIKOR熵权法', value: 'vikor_entropy' },
    { label: 'TOPSIS法', value: 'topsis' }
  ]
}


// 当前展示的方法选项
const methodOptions = ref([])


// 监听维度变化
const handleDimensionChange = (dimension) => {
  methodOptions.value = allMethods[dimension] || []
  form.value.method = ''  // 清空方法
  form.value.parameters = {}  // 清空调参参数
  applyFilters()
}

const handleMethodChange = () => {
  const key = `${form.value.dimension}_${form.value.method}`
  const config = paramForms[key] || []
  form.value.parameters = initParameters(config, form.value.parameters || {})
}

const openEditParamDialog = (row) => {
  // 确保参数对象存在
  let parameters = {}
  if (row.parameters) {
    parameters = typeof row.parameters === 'string' 
      ? JSON.parse(row.parameters) 
      : {...row.parameters}
  }

  const paramKey = `${row.dimension}_${row.method}`
  const paramConfig = paramForms[paramKey] || []
  
  // 初始化表单数据
  form.value = {
    ...row,
    parameters: initParameters(paramConfig, row.parameters || {})
  }
  
  paramEditDialogVisible.value = true
}

const initParameters = (config, initialParams = {}) => {
  // 确保传入的是对象
  const params = initialParams && typeof initialParams === 'object' 
    ? {...initialParams} 
    : {}
  
  // 如果没有配置，返回空对象
  if (!config || !Array.isArray(config)) {
    return params
  }
  
  config.forEach(item => {
    // 处理动态输入字段
    if (item.type === 'dynamic-input') {
      // 确保动态输入字段是一个对象
      if (!params[item.prop] || typeof params[item.prop] !== 'object') {
        params[item.prop] = {}
      }
      
      // 为每个字段设置默认值
      item.fields?.forEach(field => {
        if (params[item.prop][field.prop] === undefined) {
          params[item.prop][field.prop] = field.default !== undefined 
            ? field.default 
            : (field.type === 'number' ? 0 : '')
        }
      })
    } 
    // 处理普通字段
    else if (params[item.prop] === undefined) {
      params[item.prop] = item.default !== undefined 
        ? item.default 
        : (item.type === 'number' ? 0 : '')
    }
  })
  
  return params
}

// 打开参数配置对话框
const openParamDialog = () => {
  if (!form.value.dimension || !form.value.method) {
    ElMessage.warning('请先选择分析维度和方法')
    return
  }

  // 如果参数为空，初始化默认值
  if (Object.keys(form.value.parameters).length === 0) {
    const key = `${form.value.dimension}_${form.value.method}`
    form.value.parameters = initParameters(paramForms[key] || [], {})
  }
  paramDialogVisible.value = true
}


const saveParamConfig = () => {
  // 检查指标冲突
  const positive = form.value.parameters.indicators || []
  const negative = form.value.parameters.negative_indicators || []
  const duplicated = positive.filter(item => negative.includes(item))

  if (duplicated.length > 0) {
    ElMessage.warning(`正向指标和负向指标不能重叠！冲突项：${duplicated.join(', ')}`)
    return
  }

  // 处理动态输入的空值
  currentParamConfig.value.forEach(item => {
    if (item.type === 'dynamic-input') {
      Object.keys(form.value.parameters[item.prop]).forEach(key => {
        if (form.value.parameters[item.prop][key] === null) {
          delete form.value.parameters[item.prop][key]
        }
      })
    }
  })
  
  paramEditDialogVisible.value = false
  paramDialogVisible.value = false
  ElMessage.success('参数配置已保存')
}

const currentParamConfig = computed(() => {
  if (!form.value.dimension || !form.value.method) return []
  return paramForms[`${form.value.dimension}_${form.value.method}`] || []
})

const currentMethodName = computed(() => {
  const methodMap = {
    entropy: '熵权法',
    topsis: 'TOPSIS法',
    fuzzy: '模糊评价',
    grey_fuzzy: '灰色模糊法'
  }
  return methodMap[form.value.method] || form.value.method
})

const hasDefaultValues = computed(() => {
  return currentParamConfig.value.length > 0
})

const resetToDefault = () => {
  const key = `${form.value.dimension}_${form.value.method}`
  form.value.parameters = initParameters(paramForms[key] || [], {})
}


const handleEditDialogClose = () => {
  paramEditDialogVisible.value = false
  // 重置表单数据
  form.value = {
    id: null,
    name: '',
    dimension: '',
    method: '',
    description: '',
    parameters: {}
  }
}

function applyFilters() {
  currentPage.value = 1  // 重置到第一页
  fetchModels()
}


// 指标常量定义
const indicators_structural = [
  'elasticity_modulus', 
  'structural_adhesive_stress', 
  'connectors_number', 
  'back_bolts_number'
];


const paramForms = {
  structural_entropy: [
    { 
      label: '归一化方式', 
      prop: 'normalization', 
      type: 'select', 
      options: ['min-max', 'z-score'],
      default: 'min-max'
    },
    {
      label: '正向指标', 
      prop: 'indicators_structural_entropy', 
      type: 'multi-select',
      options: indicators_structural,
      default: indicators_structural
    },
    {
      label: '负向指标', 
      prop: 'negative_indicators_structural_entropy', 
      type: 'multi-select',
      options: indicators_structural,
      default: []
    },
    {
      label: '指标筛选阈值', 
      prop: 'entropy_threshold', 
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.01,
      default: 0.05,
      tip: '信息熵小于该值的指标将被自动剔除'
    }
  ],
  
  structural_topsis: [
    {
      label: '正向指标',
      prop: 'indicators_structural_topsis',
      type: 'multi-select',
      options: indicators_structural,
      default: indicators_structural
    },
    {
      label: '负向指标',
      prop: 'negative_indicators_structural_topsis',
      type: 'multi-select',
      options: indicators_structural,
      default: []
    },
    {
      label: '距离算法',
      prop: 'distance_metric',
      type: 'select',
      options: ['euclidean', 'manhattan', 'chebyshev'],
      default: 'euclidean'
    },
    {
      label: '自定义权重',
      prop: 'custom_weights',
      type: 'input',
      placeholder: '按指标顺序输入权重(逗号分隔)',
      tip: '留空则自动计算权重'
    },
    {
      label: '理想解配置',
      prop: 'ideal_solution',
      type: 'radio',
      options: [
        {label: '自动计算', value: 'auto'},
        {label: '手动输入', value: 'manual'}
      ],
      default: 'auto'
    }
  ],
  
  structural_fuzzy: [
    {
      label: '隶属度函数', 
      prop: 'membership_func_type_structural_fuzzy', 
      type: 'select',
      options: [
        {label: '线性函数', value: 'linear'},
        {label: '三角函数', value: 'triangular'},
        {label: '梯形函数', value: 'trapezoidal'},
        {label: '高斯函数', value: 'gaussian'}
      ],
      default: 'linear'
    },
    {
      label: '正向指标', 
      prop: 'indicators_structural_fuzzy', 
      type: 'multi-select',
      options: indicators_structural,
      default: indicators_structural
    },
    {
      label: '负向指标', 
      prop: 'negative_indicators_structural_fuzzy', 
      type: 'multi-select',
      options: indicators_structural,
      default: []
    },
    {
      label: '评价等级', 
      prop: 'fuzzy_levels', 
      type: 'input',
      default: '3',
      tip: '设置评价等级数量(如3级:差/中/好)'
    },
    {
      label: '权重配置',
      prop: 'fuzzy_weights',
      type: 'radio',
      options: [
        {label: '熵权法', value: 'entropy'},
        {label: 'AHP权重', value: 'ahp'},
        {label: '自定义', value: 'custom'}
      ],
      default: 'entropy'
    }
  ],
  
  structural_grey_fuzzy: [
    {
      label: '分析指标',
      prop: 'indicators_structural_grey_fuzzy',
      type: 'multi-select',
      options: indicators_structural,
      default: indicators_structural
    },
    {
      label: '分辨系数(ρ)',
      prop: 'grey_rho',
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.1,
      default: 0.5
    },
    {
      label: '理想值配置',
      prop: 'ideal_values',
      type: 'dynamic-input',
      fields: indicators_structural.map(ind => ({
        prop: ind,
        label: ind,
        type: 'number'
      }))
    },
    {
      label: '组合权重',
      prop: 'combination_weights',
      type: 'input',
      default: '0.6,0.4',
      tip: '灰色关联与模糊评分的权重比'
    },
    {
      label: '应力预警线',
      prop: 'stress_threshold',
      type: 'slider',
      min: 0.1,
      max: 1,
      step: 0.05,
      default: 0.7,
      tip: '结构胶应力超过最大值的比例时预警'
    },
    {
      label: '动态权重强度',
      prop: 'weight_adjust_factor',
      type: 'slider',
      min: 0.5,
      max: 2,
      step: 0.1,
      default: 1.5,
      tip: '值越大对高应力状态的权重调整越敏感'
    }
  ],

  geometric_composite: [
  {
    label: '偏移量公差(mm)',
    prop: 'tolerance',
    type: 'dynamic-input',
    fields: [
      {
        prop: 'x',
        label: 'X方向公差',
        type: 'number',
        min: 0.1,
        step: 0.1,
        default: 3.5
      },
      {
        prop: 'y',
        label: 'Y方向公差',
        type: 'number',
        min: 0.1,
        step: 0.1,
        default: 3.5
      },
      {
        prop: 'z',
        label: 'Z方向公差',
        type: 'number',
        min: 0.1,
        step: 0.1,
        default: 2.0
      }
    ],
    tip: '用于计算CPK和马氏距离的允许偏移范围'
  },

  {
    label: '几何指标理想值',
    prop: 'ideal_values',
    type: 'dynamic-input',
    fields: [
      {
        prop: 'panel_size',
        label: '面板尺寸(理想值)',
        type: 'number',
        default: 100.0,  // 示例默认值
        tip: '单位：mm'
      },
      {
        prop: 'panel_verticality',
        label: '垂直度(理想值)',
        type: 'number',
        default: 0.0,
        tip: '0表示完全垂直'
      },
      {
        prop: 'stitching_width',
        label: '缝宽(理想值)',
        type: 'number',
        default: 10.0,
        tip: '单位mm'
      },
      {
        prop: 'flatness',
        label: '平整度(理想值)',
        type: 'number',
        default: 0.0,
        tip: '0表示完全平整'
      }
    ]
  },

  {
    label: 'CPK方向权重',
    prop: 'weights',
    type: 'dynamic-input',
    fields: [
      {
        prop: 'cpk_x',
        label: 'X方向权重',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        default: 0.3,
        tip: 'X方向偏移量的CPK权重'
      },
      {
        prop: 'cpk_y',
        label: 'Y方向权重',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        default: 0.3,
        tip: 'Y方向偏移量的CPK权重'
      },
      {
        prop: 'cpk_z',
        label: 'Z方向权重',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        default: 0.4,
        tip: 'Z方向偏移量的CPK权重'
      },
    ],
    tip: '权重总和建议为1，系统会自动归一化'
  },

  {
    label: '综合评分权重',
    prop: 'weights',
    type: 'dynamic-input',
    fields: [
      {
        prop: 'cpk',
        label: 'CPK权重',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        default: 0.4
      },
      {
        prop: 'mahalanobis',
        label: '马氏距离权重',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        default: 0.3
      },
      {
        prop: 'fuzzy',
        label: '模糊评分权重',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
        default: 0.3
      }
    ],
    tip: '权重总和建议为1，系统会自动归一化'
  }
  ],

  damage_fuzzy_vikor: [
    // 1. 基础配置
    {
      label: '评估指标',
      prop: 'indicators_damage_fuzzy_vikor',
      type: 'multi-select',
      options: ['panel_damage_area', 'structural_adhesive_damage_length', 'cracks'],
      default: ['panel_damage_area', 'structural_adhesive_damage_length', 'cracks'],
      tip: '选择需要计算的损伤指标'
    },
    {
      label: 'VIKOR折衷系数(v)',
      prop: 'v',
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.1,
      default: 0.5,
      tip: '0侧重个体遗憾，1侧重群体效用'
    },

    // 2. 隶属度配置
    {
      label: '隶属度分位点',
      prop: 'quantile_levels',
      type: 'input',
      default: '0.2,0.5,0.8',
      tip: '逗号分隔，用于划分损伤等级（建议3个值）'
    },

    // 3. 结果分级
    {
      label: '损伤等级分界点',
      prop: 'damage_bins',
      type: 'input',
      default: '0.0,0.3,0.6,1.0',
      tip: '逗号分隔的VIKOR评分分界点'
    },
    {
      label: '等级标签',
      prop: 'damage_labels',
      type: 'input',
      default: '轻度,中度,严重',
      tip: '逗号分隔的等级名称（比分界点少1项）'
    },
  ],

  visual_defect_analysis: [
    // 1. 缺陷权重配置（平级参数）
    {
      label: '污渍权重',
      prop: 'stains_weight',
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.1,
      default: 0.3,
      tip: '污渍在综合评分中的权重'
    },
    {
      label: '裂纹权重',
      prop: 'cracks_weight',
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.1,
      default: 0.5,
      tip: '裂纹在综合评分中的权重'
    },
    {
      label: '平整度权重',
      prop: 'flatness_weight',
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.1,
      default: 0.2,
      tip: '平整度在综合评分中的权重'
    },

    // 2. 关键阈值配置
    {
      label: '污渍容忍阈值(%)',
      prop: 'stains_tolerance',
      type: 'input',
      min: 0,
      max: 100,
      default: 5,
      tip: '允许的最大污渍面积占比'
    },
    {
      label: '裂纹容忍阈值(mm)',
      prop: 'cracks_tolerance',
      type: 'input',
      min: 0,
      default: 10,
      tip: '允许的最大裂纹长度'
    },

    // 3. 综合评分权重（兼容旧版）
    {
      label: '评分权重比例',
      prop: 'score_weights',
      type: 'input',
      default: '0.6,0.3,0.1',
      tip: 'DSI,模糊评分,耐久性的权重比（逗号分隔）'
    }
  ],

  overall_vikor_entropy: [
    {
      label: '正向指标',
      prop: 'indicators_overall_vikor_entropy',
      type: 'multi-select',
      options: [
        'elasticity_modulus', 'structural_adhesive_stress', 'connectors_number',
        'back_bolts_number', 'panel_size'
      ],
      default: [],
      tip: '选择数值越大越好的正向指标'
    },
    {
      label: '负向指标',
      prop: 'negative_indicators_overall_vikor_entropy',
      type: 'multi-select',
      options: [
        'panel_verticality', 'stitching_width', 'offset_x', 'offset_y', 'offset_z',
        'flatness', 'panel_damage_area', 'structural_adhesive_damage_length', 'stains', 'cracks'
      ],
      default: ['flatness', 'panel_damage_area', 'structural_adhesive_damage_length', 'stains', 'cracks'],
      tip: '选择数值越小越好的负向指标'
    },
    {
      label: 'VIKOR折衷系数(v)',
      prop: 'v',
      type: 'slider',
      min: 0,
      max: 1,
      step: 0.1,
      default: 0.5,
      tip: '0-侧重个体遗憾，1-侧重群体效用，0.5表示平衡'
    },
    {
      label: '风险分界点',
      prop: 'risk_bins',
      type: 'input',
      default: '0.0,0.3,0.6,1.0',
      tip: '逗号分隔的VIKOR评分分界点（需4个数值）'
    }
  ]
};


// 获取模型列表
const fetchModels = async () => {
  try {
    loading.value = true
    const response = await axios.get(`${ apiUrl }/analysis/models/`, {
      params: { 
        page: currentPage.value, 
        page_size: pageSize.value,
        search: filters.value.searchQuery,
        dimension: filters.value.dimension,
        method: filters.value.method,
        ordering: filters.value.sortField ? 
          `${filters.value.sortOrder === 'desc' ? '-' : ''}${filters.value.sortField}` : ''
      },
    })
    modelList.value = response.data.data.results
    totalModels.value = response.data.data.count
    loading.value = false
  } catch (error) {
    ElMessage.error('获取模型列表失败')
    loading.value = false
  }
}
const showCreateDialog = () => {
  openCreateDialog()
}

// 打开新建对话框
const openCreateDialog = (model = null) => {
  if (model) {
    form.value = { ...model }
  } else {
    form.value = {
      id: null,
      name: '',
      method: '',
      version: '',
      description: '',
      parameters: {},
      applicable_resilience_types: [],
      dimension: ''
    }
  }
  dialogCreateVisible.value = true
}

// 打开编辑对话框
const openModifyDialog = (model = null) => {
  if (model) {
    form.value = { ...model }
  } else {
    form.value = {
      id: null,
      name: '',
      method: '',
      dimension: '',
      version: '',
      description: '',
      applicable_resilience_types: [],
    }
  }
  dialogModifyVisible.value = true
}

const createModel = async () => {
  if(!form.value.name) {
    ElMessage.warning('模型名称不能为空')
    return
  }
  if(!form.value.method || !form.value.dimension) {
    ElMessage.warning('分析维度和模型方法不能为空')
    return
  }
  try {
    const response = await axios.post(`${apiUrl}/analysis/model/create/`, form.value)
    ElMessage.success('创建成功')
    dialogCreateVisible.value = false
    refreshList()
  } catch (error) {
    let errorMessage = "创建失败";
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    ElMessage.error(errorMessage);
  }
}

const saveModel = async () => {
  try {
    const response = await axios.post(`${apiUrl}/analysis/model/${selectedModel.value.id}/`, form.value)
    ElMessage.success('保存成功')
    dialogModifyVisible.value = false
    refreshList()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 编辑模型
const editModel = (model: any) => {
  if(model.parameters && typeof model.parameters === 'string') {
    model.parameters = JSON.parse(model.parameters)
  }
  selectedModel.value = model
  openModifyDialog(model)
}


// 删除模型
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定删除该模型吗？', '提示', {
      type: 'warning',
    })
    await axios.delete(`${apiUrl}/analysis/model/delete/${row.id}/`)
    ElMessage.success('删除成功')
    fetchModels()
  } catch (e) {
    // 用户取消操作不提示错误
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const getMethodText = (method) => {
  const map = {
    'Entropy-TOPSIS': '熵权-TOPSIS',
    'SVM': '支持向量机',
    'RandomForest': '随机森林',
    'Fuzzy-AHP': '模糊层次分析',
    'DecisionTree': '决策树',
    'grey_fuzzy': '灰色关联度法',
    'entropy': '熵权法',
    'topsis': 'TOPSIS法',
    'fuzzy': '模糊综合评价',
    'composite': '精度综合评价',
    'error': '误差分析法',
    'fuzzy_vikor': '模糊VIKOR法',
    'state_transition': '状态转移分析',
    'ahp': 'AHP层次分析法',
    'defect_analysis': '缺陷检测法',
    'expert': '专家赋权法',
    'vikor_entropy': 'VIKOR熵权法'
  }
  return map[method] || method
}

const getMethodTagType = (method) => {
  const map = {
    'Entropy-TOPSIS': 'success',
    'SVM': 'info',
    'RandomForest': 'warning',
    'Fuzzy-AHP': 'primary',
    'DecisionTree': 'danger',
    'grey_fuzzy': 'primary',
    'entropy': 'info',
    'topsis': 'success',
    'fuzzy': 'warning',
    'composite': 'info',
    'error': 'primary',
    'fuzzy_vikor': 'warning',
    'state_transition': 'info',
    'ahp': 'primary',
    'defect_analysis': 'info',
    'expert': 'warning',
    'vikor_entropy': 'success'
  }
  return map[method] || 'default'
}


const handleSizeChange = (val) => {
  pageSize.value = val
  fetchModels()
}

const handlePageChange = (val) => {
  currentPage.value = val
  fetchModels()
}

const refreshList = () => {
  currentPage.value = 1
  fetchModels()
}

// 初始化加载
onMounted(() => {
  fetchModels()
})
</script>

<style scoped lang="scss">
.model-container {
  padding: 16px;
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  background-color: #f9fafb;

  .model-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;

    h2 {
      font-size: 20px;
      color: #1d2129;
      margin: 0;
      font-weight: 600;
    }

    .action-buttons {
      display: flex;
      gap: 12px;

      .el-button {
        height: 36px;
        padding: 0 16px;
        font-size: 14px;
        display: inline-flex;
        align-items: center;

        &[type="primary"] {
          padding: 0 18px;
          font-weight: 500;
          
          .el-icon {
            margin-right: 6px;
            font-size: 16px;
          }
        }
        
        &[disabled] {
          opacity: 0.6;
        }
        
        .el-icon {
          font-size: 16px;
          & + span {
            margin-left: 6px;
          }
        }
      }
    }
  }

  .model-list-container {
    flex: 1;

    .model-card {
      height: 100%;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border-radius: 8px;

      :deep(.el-card__body) {
        padding: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .filter-bar {
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #eee;
        flex-wrap: wrap;
        gap: 15px;

        .el-input {
          width: 300px;

          &:deep(.el-input__wrapper) {
            border-radius: 4px;
          }
        }

        .filter-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;

          .el-select {
            width: 150px;

            &:deep(.el-select__wrapper) {
              border-radius: 4px;
            }
          }

          .sort-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 0 12px;
          }

          .reset-btn, .refresh-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 0 12px;
          }
        }
      }

      .model-table {
        flex: 1;

        :deep(.el-table) {
          width: 100%;
          border-collapse: collapse;
        }

        :deep(.el-table__header-wrapper) {
          background-color: #f5f7fa;
        }

        :deep(.el-table__header tr th) {
          background-color: #f5f7fa;
          color: #4e5969;
          font-weight: 500;
          border-bottom: 1px solid #eee;
        }

        :deep(.el-table__body tr td) {
          border-bottom: 1px solid #f0f0f0;
        }

        :deep(.el-table__body tr:hover > td) {
          background-color: #f5f7fa;
        }

        :deep(.model-name-cell) {
          display: flex;
          align-items: center;

          .el-icon {
            margin-right: 8px;
            color: #409eff;
          }

          .name-text {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        :deep(.dimension-method-cell) {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;

          .dimension-tag, .method-tag {
            margin-bottom: 4px;
            height: 24px;
            line-height: 24px;
            padding: 0 8px;
            border-radius: 4px;
            font-size: 12px;
          }
        }

        :deep(.edit-btn) {
          color: #409eff;
          border-color: #409eff;
          background-color: #ecf5ff;
          margin-right: 5px;

          &:hover {
            background-color: #e6f2ff;
            color: #3a8ee6;
            border-color: #3a8ee6;
          }
        }

        :deep(.delete-btn) {
          &:hover {
            opacity: 0.9;
          }
        }
      }

      .pagination-container {
        padding: 16px;
        display: flex;
        justify-content: flex-end;
        border-top: 1px solid #eee;

        :deep(.el-pagination) {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        :deep(.el-pagination__sizes) {
          margin-right: 10px;
        }
      }
    }
  }
}

/* 对话框样式 */
.custom-dialog {
  border-radius: 8px;
  overflow: hidden;

  :deep(.el-dialog__header) {
    padding: 18px 20px;
    border-bottom: 1px solid #eee;
  }

  :deep(.el-dialog__title) {
    font-size: 16px;
    font-weight: 500;
    color: #1d2129;
  }

  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
  }

  :deep(.el-dialog__footer) {
    padding: 16px 20px;
    border-top: 1px solid #eee;
  }

  :deep(.el-button) {
    margin-left: 8px;
  }
}

.form-container {
  :deep(.el-form) {
    width: 100%;
  }

  :deep(.el-form-item) {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(.el-form-item__label) {
    color: #4e5969;
    font-weight: 500;
  }

  :deep(.el-input),
  :deep(.el-select),
  :deep(.el-input-number) {
    width: 100%;
  }

  .form-hint {
    line-height: 1.5;
    font-size: 12px;
    color: #909399;
  }

  .param-btn {
    margin-bottom: 4px;
  }
}

/* 参数配置对话框 */
.param-config-dialog {
  border-radius: 8px;

  :deep(.el-dialog__body) {
    padding: 20px;
  }

  :deep(.el-form-item) {
    margin-bottom: 22px;
    padding: 0 10px;
  }

  :deep(.el-form-item__label) {
    font-weight: 500;
    color: #606266;
    padding-right: 20px;
  }

  :deep(.el-scrollbar__view) {
    padding: 5px 10px;
  }

  :deep(.el-input),
  :deep(.el-select) {
    width: 100%;
  }

  .slider-container {
    display: flex;
    align-items: center;
    width: 100%;
  }

  :deep(.el-slider) {
    margin-top: 8px;
  }

  .param-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 6px;
    line-height: 1.4;
  }

  .radio-group {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  :deep(.el-radio) {
    margin-right: 0;
  }

  .dynamic-field {
    background-color: #f8f9fa;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
    border: 1px solid #ebeef5;
  }

  .dynamic-field:last-child {
    margin-bottom: 0;
  }

  .dynamic-field :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  :deep(.dialog-footer) {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
  }
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .model-container {
    .model-list-container {
      .model-card {
        .filter-bar {
          flex-direction: column;
          align-items: flex-start;

          .el-input {
            width: 100% !important;
          }

          .filter-actions {
            width: 100%;
            justify-content: flex-start;
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .model-container {
    padding: 12px;

    .model-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;

      .action-buttons {
        width: 100%;
        flex-direction: column;

        .el-button {
          width: 100%;
          justify-content: center;
        }
      }
    }

    .model-list-container {
      .model-card {
        .filter-bar {
          .filter-actions {
            flex-direction: column;
            width: 100%;
            gap: 8px;

            .el-select {
              width: 100% !important;
            }

            .sort-btn, .reset-btn, .refresh-btn {
              width: 100%;
              justify-content: center;
            }
          }
        }

        .model-table {
          :deep(.el-table__fixed-right) {
            width: 120px !important;
          }

          :deep(.el-button) {
            padding: 0 8px;
            font-size: 12px;

            .el-icon {
              font-size: 14px;
            }

            span {
              display: none;
            }
          }
        }
      }
    }
  }

  .param-config-dialog {
    width: 90% !important;
  }

  .param-config-dialog :deep(.el-form-item__label) {
    width: 100px !important;
  }

  .dynamic-field :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }

  .custom-dialog {
    width: 90% !important;
  }
}
</style>