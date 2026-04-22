/**
 * 客户端图片压缩（仅浏览器运行，不能在 server / route handler 里调用）
 *
 * 场景：店里用手机拍照，原图常 3-8MB。直传会导致：
 *  1) OCR 端点 8MB 上限容易触发
 *  2) 4G 网络上传慢，店员等待焦虑
 *  3) COS 存储成本（私有桶长期保留）
 *
 * 压缩策略：
 *  - maxDimension 默认 1920px，覆盖长边；身份证 / 银行卡这样的证件 1920px 宽足够 OCR
 *  - JPEG quality 0.85，兼顾清晰度与体积
 *  - 输出始终 image/jpeg（即便输入是 heic / png），浏览器自己转码
 *  - 体积若大于原图就用原图（极小图 / 已压缩图场景）
 *
 * 异常处理：任何步骤失败都返回原 File，不阻断业务；上游已有 10MB 上限兜底。
 */

export type CompressOptions = {
  maxDimension?: number
  quality?: number
  /** 输出文件名（默认沿用原文件名，但扩展名改为 .jpg） */
  fileName?: string
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  const maxDimension = opts.maxDimension ?? 1920
  const quality = opts.quality ?? 0.85

  if (typeof window === 'undefined') return file
  if (!file.type.startsWith('image/')) return file

  try {
    const bitmap = await loadBitmap(file)
    const { width: sw, height: sh } = bitmap
    const scale = Math.min(1, maxDimension / Math.max(sw, sh))
    const tw = Math.round(sw * scale)
    const th = Math.round(sh * scale)

    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, tw, th)
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    if (!blob) return file
    // 若压缩后反而更大，保留原图
    if (blob.size >= file.size) return file

    const outName = opts.fileName ?? replaceExt(file.name || 'image.jpg', 'jpg')
    return new File([blob], outName, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // 优先用 createImageBitmap（快、OffscreenCanvas 友好）；iOS 老 Safari 无此 API 时降级
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // fallthrough
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image load failed'))
    }
    img.src = url
  })
}

function replaceExt(name: string, ext: string): string {
  const i = name.lastIndexOf('.')
  if (i < 0) return `${name}.${ext}`
  return `${name.slice(0, i)}.${ext}`
}
