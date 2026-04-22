import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { canCreateRecycleRecords } from '@/lib/roles'
import { recognizeBankCard } from '@/lib/ocr'

/**
 * 银行卡 OCR 识别端点。
 *
 * 请求：multipart/form-data，字段 `file`（银行卡正面照片）
 * 响应：{ cardNumber, bankName, cardType }
 *
 * 前端调用时机：付款方式选"银行卡" → 拍卡正面 → 自动回填银行名 + 卡号
 * 识别失败时前端降级到手填（银行名 + 完整卡号），不阻塞流程。
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
    if (file.size > 8 * 1024 * 1024) {
      return Response.json({ error: '图片过大，请压缩后重试' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const result = await recognizeBankCard(buf)

    if (!result.cardNumber) {
      return Response.json({ error: 'OCR 未识别到卡号，请手填' }, { status: 422 })
    }
    return Response.json({
      cardNumber: result.cardNumber,
      bankName: result.bankName,
      cardType: result.cardType,
    })
  } catch (e) {
    console.error('[ocr-bankcard] failed:', e)
    const msg = e instanceof Error ? e.message : 'OCR 调用失败'
    return Response.json({ error: msg }, { status: 500 })
  }
}
