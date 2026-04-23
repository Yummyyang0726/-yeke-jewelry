import { NextRequest } from 'next/server'
import { db, getStore } from '@/lib/recycle-db'
import { encryptField, extractIdLast4, computeIsMinor } from '@/lib/encryption'
import { uploadPrivateToCOS } from '@/lib/cos'

// ─── In-memory rate limiter ───────────────────────────────────────────────────
interface RateEntry {
  count: number
  resetAt: number
}
declare global {
  // eslint-disable-next-line no-var
  var __customerRateLimit: Map<string, RateEntry> | undefined
}
const rateLimit: Map<string, RateEntry> =
  global.__customerRateLimit ?? new Map()
global.__customerRateLimit = rateLimit

const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

// ─── Helper: upload one image, update DB column ───────────────────────────────
async function uploadImg(
  file: File,
  recordId: number,
  kind: 'front' | 'back',
  col: 'idFrontPath' | 'idBackPath'
): Promise<void> {
  if (file.size === 0 || file.size > 10 * 1024 * 1024) return
  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const key = `recycle/${recordId}/${kind}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 7)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await uploadPrivateToCOS(buffer, key, file.type || 'image/jpeg')
  db.prepare(
    `UPDATE RecycleRecord SET ${col} = ?, updatedAt = datetime('now') WHERE id = ?`
  ).run(key, recordId)
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip =
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: '提交过于频繁，请 1 小时后重试' },
      { status: 429 }
    )
  }

  const form = await req.formData()
  const storeId = Number(form.get('storeId'))
  const customerName = String(form.get('customerName') ?? '').trim()
  const idNumber = String(form.get('idNumber') ?? '').trim()
  const phone = String(form.get('phone') ?? '').trim()
  const frontFile = form.get('front') as File | null
  const backFile = form.get('back') as File | null

  // Validate
  if (!storeId) return Response.json({ error: '请选择门店' }, { status: 400 })
  if (!customerName) return Response.json({ error: '请填写姓名' }, { status: 400 })
  if (!/^(\d{17}[\dXx]|\d{15})$/.test(idNumber)) {
    return Response.json({ error: '身份证号格式不正确' }, { status: 400 })
  }
  if (!/^\d{11}$/.test(phone)) {
    return Response.json({ error: '手机号必须为 11 位数字' }, { status: 400 })
  }
  if (computeIsMinor(idNumber)) {
    return Response.json(
      { error: '未满 18 周岁请联系店员线下办理' },
      { status: 400 }
    )
  }

  const store = getStore(storeId)
  if (!store) return Response.json({ error: '门店不存在' }, { status: 400 })

  const idNumberEncrypted = encryptField(idNumber)
  const idNumberLast4 = extractIdLast4(idNumber)

  // Placeholder recordNo for drafts — will be replaced by real YK-xxx when employee completes
  const draftNo = `DRAFT-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`

  const today = new Date().toISOString().slice(0, 10)

  // Insert draft record
  const res = db
    .prepare(
      `INSERT INTO RecycleRecord (
        recordNo, recordDate, storeId,
        customerName, idNumberEncrypted, idNumberLast4, phone,
        isMinor, consentAccepted, consentAt,
        totalAmount, totalWeight, status,
        operatorName, operatorDisplayName, paymentMethod
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, datetime('now'), 0, 0, 'draft', '(客户自助)', '', '')`
    )
    .run(draftNo, today, storeId, customerName, idNumberEncrypted, idNumberLast4, phone)

  const recordId = Number(res.lastInsertRowid)

  // Upload photos (non-fatal if fail)
  try {
    const uploads: Promise<void>[] = []
    if (frontFile && frontFile.size > 0) {
      uploads.push(uploadImg(frontFile, recordId, 'front', 'idFrontPath'))
    }
    if (backFile && backFile.size > 0) {
      uploads.push(uploadImg(backFile, recordId, 'back', 'idBackPath'))
    }
    await Promise.all(uploads)
  } catch {
    // Photo upload failure is non-fatal — employee can retake
  }

  return Response.json({ success: true }, { status: 201 })
}
