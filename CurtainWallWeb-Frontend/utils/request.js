import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: 'http://47.102.208.89:8007',
  timeout: 600000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false
})

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('Response error:', error)
    if (error.response) {
      ElMessage.error(error.response.data?.message || '请求失败')
    } else if (error.request) {
      ElMessage.error('服务器无响应，请检查网络连接')
    } else {
      ElMessage.error('请求配置错误')
    }
    return Promise.reject(error)
  }
)

export default request
