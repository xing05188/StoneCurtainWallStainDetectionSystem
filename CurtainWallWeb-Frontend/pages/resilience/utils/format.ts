/**
 * 格式化文件大小
 * @param {number} bytes 文件大小(字节)
 * @returns {string} 格式化后的字符串
 */
export function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  /**
   * 格式化日期时间
   * @param {string|Date} date 日期字符串或对象
   * @returns {string} 格式化后的日期时间
   */
  export function formatDateTime(date: string | number | Date) {
    if (!date) return ''
    
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }



  /**
 * 格式化字节大小为易读的内存单位
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的字符串
 */
export const formatMemory = (bytes: number) => {
  if (bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const digitGroups = Math.floor(Math.log(bytes) / Math.log(1024))
  return parseFloat((bytes / Math.pow(1024, digitGroups)).toFixed(1) + ' ' + units[digitGroups])
}

/**
 * 格式化磁盘空间大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的字符串
 */
export const formatDiskSpace = (bytes: number) => {
  if (bytes === 0) return '0 B'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const digitGroups = Math.floor(Math.log(bytes) / Math.log(1024))
  
  // 磁盘空间显示更精确，保留2位小数
  return parseFloat((bytes / Math.pow(1024, digitGroups)).toFixed(2))
}

/**
 * 格式化网络流量
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的字符串
 */
export const formatNetwork = (bytes: number) => {
  if (bytes === 0) return '0 B/s'
  
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const digitGroups = Math.floor(Math.log(bytes) / Math.log(1024))
  
  // 网络流量显示更精确，保留2位小数
  const value = parseFloat((bytes / Math.pow(1024, digitGroups)).toFixed(2))
  
  // 对于小于1 KB/s的值，显示为 B/s 并取整
  if (digitGroups === 0) {
    return Math.round(bytes) + ' ' + units[0]
  }
  
  return value + ' ' + units[digitGroups]
}

    /**
     * 格式化时间为易读格式
     * @param {Date | number} date - 日期对象或时间戳
     * @returns {string} 格式化后的时间字符串
     */
    export const formatTime = (date: number | Date): string => {
      let d: Date;
    
      // 如果传入的是数字（时间戳），则将其转换为Date对象
      if (typeof date === 'number') {
        d = new Date(date);
      } else if (date instanceof Date) {
        d = date;
      } else {
        return '';
      }
    
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    
      // 今天的时间显示
      if (d.toDateString() === now.toDateString()) {
        if (diffInSeconds < 60) {
          return `${diffInSeconds}秒前`;
        } else if (diffInSeconds < 3600) {
          return `${Math.floor(diffInSeconds / 60)}分钟前`;
        } else {
          return d.toLocaleString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
    
      // 昨天的时间显示
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        return `昨天 ${d.toLocaleString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
    
      // 本周内的时间显示
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      if (d > oneWeekAgo) {
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return `${weekdays[d.getDay()]} ${d.toLocaleString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
    
      // 更早的时间显示完整日期和时间
      return d.toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(/\//g, '-');
    };

/**
 * 格式化运行时间为易读格式
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的运行时间字符串
 */
export const formatUptime = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds}秒`
  }
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  let result = []
  if (days > 0) result.push(`${days}天`)
  if (hours > 0) result.push(`${hours}小时`)
  if (minutes > 0) result.push(`${minutes}分钟`)
  
  return result.join(' ') || '0分钟'
}

/**
 * 格式化百分比值
 * @param {number} value - 原始值 (0-1 或 0-100)
 * @param {boolean} isDecimal - 是否为小数形式 (0-1)
 * @returns {string} 格式化后的百分比字符串
 */
export const formatPercent = (value: number, isDecimal = false) => {
  const percentValue = isDecimal ? value * 100 : value
  return `${parseFloat(percentValue.toFixed(1))}%`
}

export default {
  formatMemory,
  formatDiskSpace,
  formatNetwork,
  formatTime,
  formatUptime,
  formatPercent
}