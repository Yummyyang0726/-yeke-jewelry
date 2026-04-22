import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { canCreateRecycleRecords } from '@/lib/roles'
import { recognizeIdFront } from '@/lib/ocr'

/**
 * 身份证正面 OCR 识别端点。
 *
 * 请求：multipart/form-data，字段 `file`（身份证正面照片）
 * 响应：{ name, idNumber, birth?, address? }
 *
 * 失败策略：返回 5xx/4xx 时前端静默降级到手填，不打断录单流程。
 * 所以这里不 throw，统一捕获并包装为 { error }。
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canCreateRecycleRecords(session.role)) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return Response.json({ error: '未收到图片' }, { status: 400 })
    }
    // 8MB 上限（腾讯云 OCR 要求 <7MB base64；原图留点余量）
    if (file.size > 8 * 1024 * 1024) {
      return Response.json({ error: '图片过大，请压缩后重试' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const result = await recognizeIdFront(buf)

    if (!result.idNumber) {
      return Response.json({ error: 'OCR 未识别到身份证号，请手动填写' }, { status: 422 })
    }
    return Response.json({
      name: result.name,
      idNumber: result.idNumber,
      birth: result.birth || '',
      address: result.address || '',
    })
  } catch (e) {
    // 不泄露内部错误给前端，但打日志便于排查
    console.error('[ocr-idcard] failed:', e)
    const msg = e instanceof Error ? e.message : 'OCR 调用失败'
    return Response.json({ error: msg }, { status: 500 })
  }
}
