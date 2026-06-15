export interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  outputFormat?: 'image/jpeg' | 'image/png'
}

const DEFAULT_OPTIONS: CompressOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.6,
  outputFormat: 'image/jpeg',
}

export function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img

        if (opts.maxWidth && width > opts.maxWidth) {
          height = Math.round(height * (opts.maxWidth / width))
          width = opts.maxWidth
        }
        if (opts.maxHeight && height > opts.maxHeight) {
          width = Math.round(width * (opts.maxHeight / height))
          height = opts.maxHeight
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建画布上下文'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('图片压缩失败'))
              return
            }
            const ext = opts.outputFormat === 'image/png' ? '.png' : '.jpg'
            const name = file.name.replace(/\.[^.]+$/, '') + ext
            const compressedFile = new File([blob], name, {
              type: opts.outputFormat || 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          opts.outputFormat || 'image/jpeg',
          opts.quality,
        )
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}