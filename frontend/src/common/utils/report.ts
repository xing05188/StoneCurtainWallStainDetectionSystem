import type { DetectionTaskItem } from "@@/apis/detection/type"
import dayjs from "dayjs"
import { jsPDF as JsPDF } from "jspdf"

const PAGE_WIDTH = 1240
const PAGE_HEIGHT = 1754
const MARGIN = 36

function fmtDate(value?: string | null) {
  if (!value) return "-"
  const d = dayjs(value)
  return d.isValid() ? d.format("YYYY-MM-DD HH:mm:ss") : String(value)
}

function safe(value: unknown) {
  if (value === null || value === undefined || value === "") return "-"
  return String(value)
}

function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const chars = Array.from(text)
  let line = ""
  let currentY = y
  for (const char of chars) {
    const testLine = line + char
    const width = ctx.measureText(testLine).width
    if (width > maxWidth && line) {
      ctx.fillText(line, x, currentY)
      line = char
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY)
    currentY += lineHeight
  }
  return currentY
}

async function loadImage(url?: string | null): Promise<HTMLImageElement | null> {
  if (!url) return null
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    const objUrl = URL.createObjectURL(blob)
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = objUrl
    })
    URL.revokeObjectURL(objUrl)
    return image
  } catch {
    return null
  }
}

function drawImageCard(
  ctx: CanvasRenderingContext2D,
  title: string,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  width: number,
  height: number
) {
  ctx.fillStyle = "#f8fafc"
  ctx.strokeStyle = "#d1d5db"
  ctx.lineWidth = 1
  ctx.fillRect(x, y, width, height)
  ctx.strokeRect(x, y, width, height)

  ctx.fillStyle = "#111827"
  ctx.font = "bold 30px sans-serif"
  ctx.fillText(title, x + 14, y + 40)

  const innerX = x + 12
  const innerY = y + 56
  const innerW = width - 24

  if (!img) {
    ctx.fillStyle = "#6b7280"
    ctx.font = "24px sans-serif"
    ctx.fillText("无可用图片", innerX + 8, innerY + 40)
    return
  }

  const ratio = innerW / img.width
  const drawW = innerW
  const drawH = img.height * ratio
  const drawX = innerX
  const drawY = innerY
  ctx.drawImage(img, drawX, drawY, drawW, drawH)
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  headers: string[],
  rows: string[][],
  x: number,
  y: number,
  width: number,
  maxRows: number = 8
) {
  const colWidth = width / headers.length
  const rowHeight = 38
  const headerHeight = 42

  // Draw header
  ctx.fillStyle = "#1f5fa8"
  ctx.fillRect(x, y, width, headerHeight)
  ctx.fillStyle = "#ffffff"
  ctx.font = "bold 22px sans-serif"
  ctx.textAlign = "left"
  for (let i = 0; i < headers.length; i++) {
    const text = headers[i]
    const fontSize = colWidth > 180 ? 22 : 20
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.fillText(text, x + i * colWidth + 8, y + 28)
  }

  // Draw rows
  let currentY = y + headerHeight
  const displayRows = Math.min(rows.length, maxRows)

  ctx.fillStyle = "#111827"
  ctx.font = "20px sans-serif"
  ctx.textAlign = "left"

  for (let i = 0; i < displayRows; i++) {
    const row = rows[i]
    // Alternate row colors
    if (i % 2 === 0) {
      ctx.fillStyle = "#f5f7fa"
      ctx.fillRect(x, currentY, width, rowHeight)
    }
    // Draw border
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 1
    ctx.strokeRect(x, currentY, width, rowHeight)

    // Draw text
    ctx.fillStyle = "#111827"
    ctx.font = "20px sans-serif"
    for (let j = 0; j < row.length; j++) {
      const text = row[j]
      ctx.fillText(text, x + j * colWidth + 8, currentY + 26)
    }
    currentY += rowHeight
  }

  // Draw border around entire table
  ctx.strokeStyle = "#d1d5db"
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, width, currentY - y)

  return currentY
}

export async function exportSingleDetectionPdf(task: DetectionTaskItem, fileName?: string) {
  const canvas = await renderSingleTaskPage(task)
  const doc = new JsPDF({ unit: "pt", format: "a4" })
  const imgData = canvas.toDataURL("image/jpeg", 0.95)
  doc.addImage(imgData, "JPEG", 0, 0, 595.28, 841.89)
  doc.save(fileName || `detection-report-${task.id}.pdf`)
}

async function renderSingleTaskPage(task: DetectionTaskItem) {
  const [originImage, processedImage] = await Promise.all([
    loadImage(task.imageSignedUrl),
    loadImage(task.processedImageSignedUrl)
  ])

  // Single page layout
  const canvas = document.createElement("canvas")
  canvas.width = PAGE_WIDTH
  canvas.height = PAGE_HEIGHT
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("无法创建画布")

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)

  // Title
  ctx.fillStyle = "#111827"
  ctx.font = "bold 60px sans-serif"
  ctx.fillText("幕墙污渍检测分析报告", MARGIN, 70)

  ctx.font = "24px sans-serif"
  ctx.fillStyle = "#4b5563"
  ctx.fillText(`生成时间：${dayjs().format("YYYY-MM-DD HH:mm:ss")}`, MARGIN, 110)

  // Basic info fields - one per line
  let y = 155
  ctx.fillStyle = "#111827"
  ctx.font = "24px sans-serif"

  const fields: Array<[string, unknown]> = [
    ["任务ID", task.id],
    ["建筑", task.buildingName],
    ["楼层", task.locationFloor],
    ["分区", task.locationSection],
    ["状态", task.status],
    ["污渍类型", task.stainType],
    ["污渍占比", task.affectedAreaPercentage ? `${task.affectedAreaPercentage}%` : undefined],
    ["总结", task.summary],
    ["检测时间", fmtDate(task.createdAt)]
  ]

  for (const [k, v] of fields) {
    y = drawTextBlock(ctx, `${k}：${safe(v)}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2, 32)
  }

  // Region table
  y += 8
  const regions = task.regions || []
  const headers = ["#", "Label", "Confidence", "BBox(x1,y1,x2,y2)"]
  const tableRows: string[][] = []

  if (regions.length > 0) {
    for (let i = 0; i < Math.min(regions.length, 6); i++) {
      const r = regions[i]
      const coords = `${Number(r.bbox[0]).toFixed(2)},${Number(r.bbox[1]).toFixed(2)},${Number(r.bbox[2]).toFixed(2)},${Number(r.bbox[3]).toFixed(2)}`
      tableRows.push([
        String(i + 1),
        safe(r.label),
        Number(r.confidence).toFixed(4),
        coords
      ])
    }
  }

  ctx.fillStyle = "#1f2937"
  ctx.font = "bold 28px sans-serif"
  ctx.fillText("区域明细", MARGIN, y)
  y += 28

  if (tableRows.length > 0) {
    y = drawTable(ctx, headers, tableRows, MARGIN, y, PAGE_WIDTH - MARGIN * 2, 6)
  } else {
    ctx.fillStyle = "#6b7280"
    ctx.font = "22px sans-serif"
    ctx.fillText("暂无区域结果", MARGIN, y + 20)
    y += 50
  }

  y += 28

  // Images section - full width
  ctx.fillStyle = "#1f2937"
  ctx.font = "bold 28px sans-serif"
  ctx.fillText("检测图像", MARGIN, y)
  y += 28

  const imgGap = 20
  const imgW = (PAGE_WIDTH - MARGIN * 2 - imgGap) / 2
  const imgH = 380

  drawImageCard(ctx, "原图", originImage, MARGIN, y, imgW, imgH)
  drawImageCard(ctx, "检测后图片", processedImage, MARGIN + imgW + imgGap, y, imgW, imgH)

  return canvas
}

export async function exportSelectedDetectionPdf(tasks: DetectionTaskItem[], fileName?: string) {
  if (!tasks.length) {
    throw new Error("未选择任何历史记录")
  }

  const doc = new JsPDF({ unit: "pt", format: "a4" })

  for (let i = 0; i < tasks.length; i++) {
    const canvas = await renderSingleTaskPage(tasks[i])
    const imgData = canvas.toDataURL("image/jpeg", 0.95)
    if (i > 0) {
      doc.addPage("a4", "portrait")
    }
    doc.addImage(imgData, "JPEG", 0, 0, 595.28, 841.89)
  }

  doc.save(fileName || `history-selected-${dayjs().format("YYYYMMDD-HHmmss")}.pdf`)
}

export async function exportHistorySummaryPdf(
  records: DetectionTaskItem[],
  filters: {
    buildingName?: string
    status?: string
    startTime?: string
    endTime?: string
  }
) {
  const canvas = document.createElement("canvas")
  canvas.width = PAGE_WIDTH
  canvas.height = PAGE_HEIGHT
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("无法创建画布")

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  ctx.fillStyle = "#111827"
  ctx.font = "bold 52px sans-serif"
  ctx.fillText("历史检测汇总报告", MARGIN, 60)

  ctx.font = "26px sans-serif"
  ctx.fillStyle = "#4b5563"
  ctx.fillText(`生成时间：${dayjs().format("YYYY-MM-DD HH:mm:ss")}`, MARGIN, 95)

  ctx.fillStyle = "#111827"
  ctx.font = "28px sans-serif"
  let y = 136
  y = drawTextBlock(ctx, `筛选-建筑：${safe(filters.buildingName)}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2, 30)
  y = drawTextBlock(ctx, `筛选-状态：${safe(filters.status)}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2, 30)
  y = drawTextBlock(ctx, `筛选-开始：${safe(filters.startTime)}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2, 30)
  y = drawTextBlock(ctx, `筛选-结束：${safe(filters.endTime)}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2, 30)
  y = drawTextBlock(ctx, `记录数量：${records.length}`, MARGIN, y, PAGE_WIDTH - MARGIN * 2, 30)

  y += 18
  ctx.fillStyle = "#1f2937"
  ctx.font = "bold 28px sans-serif"
  ctx.fillText("当前页记录", MARGIN, y)
  y += 20

  ctx.font = "24px sans-serif"
  const maxRows = Math.min(records.length, 20)
  for (let i = 0; i < maxRows; i++) {
    const item = records[i]
    const line = `${i + 1}. ID:${safe(item.id)}  建筑:${safe(item.buildingName)}  状态:${safe(item.status)}  污渍:${safe(item.stainType)}  面积:${safe(item.affectedAreaPercentage)}%  时间:${fmtDate(item.createdAt)}`
    y = drawTextBlock(ctx, line, MARGIN, y + 14, PAGE_WIDTH - MARGIN * 2, 28)
  }

  const doc = new JsPDF({ unit: "pt", format: "a4" })
  const imgData = canvas.toDataURL("image/jpeg", 0.95)
  doc.addImage(imgData, "JPEG", 0, 0, 595.28, 841.89)
  doc.save(`history-summary-${dayjs().format("YYYYMMDD-HHmmss")}.pdf`)
}