import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import {
  db,
  getStore,
  nextRecordNo,
  type RecycleRecordRow,
} from '@/lib/recycle-db'
import { canCreateRecycleRecords, canReadRecycleRecords } from '@/lib/roles'
import {
  encryptField,
  extractIdLast4,
  computeIsMinor,
  maskIdNumber,
} from '@/lib/encryption'

type ItemInput = {
  material: string
  purity: string
  weightG: number
  unitPrice: number
  amount: number
}

const ALLOWED_MATERIALS = ['足金', 'K金', '铂金', '银', '其他']
const ALLOWED_PAYMENT_METHODS = ['bank', 'alipay', 'wechat', 'other']

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canReadRecycleRecords(session.role)) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const url = req.nextUrl
  const from = url.searchParams.get('from') || ''
  const to = url.searchParams.get('to') || ''
  const storeId = url.searchParams.get('storeId') || ''
  const q = (url.searchParams.get('q') || '').trim()
  const missingBack = url.searchParams.get('missingBack') === '1'

  const where: string[] = []
  const args: (string | number)[] = []
  if (from) {
    where.push('r.recordDate >= ?')
    args.push(from)
  }
  if (to) {
    where.push('r.recordDate <= ?')
    args.push(to)
  }
  if (storeId) {
    where.push('r.storeId = ?')
    args.push(Number(storeId))
  }
  if (q) {
    where.push(
      '(r.customerName LIKE ? OR r.phone LIKE ? OR r.idNumberLast4 LIKE ? OR r.recordNo LIKE ?)'
    )
    const like = `%${q}%`
    args.push(like, like, like, like)
  }
  if (missingBack) {
    // 反面缺失：idBackPath 为 NULL 或空字符串
    where.push("(r.idBackPath IS NULL OR r.idBackPath = '')")
  }
  const sql = `
    SELECT r.*, s.shortName AS storeShortName, s.name AS storeName
    FROM RecycleRecord r
    JOIN RecycleStore s ON s.id = r.storeId
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY r.recordDate DESC, r.id DESC
    LIMIT 200
  `
  const rows = db.prepare(sql).all(...args) as (RecycleRecordRow & {
    storeShortName: string
    storeName: string
  })[]

  // Reconstruct a display-safe masked ID from last4 (cheap, avoids decrypt)
  const records = rows.map((r) => ({
    id: r.id,
    recordNo: r.recordNo,
    recordDate: r.recordDate,
    storeId: r.storeId,
    storeShortName: r.storeShortName,
    storeName: r.storeName,
    customerName: r.customerName,
    idNumberMasked: `***${'*'.repeat(11)}${r.idNumberLast4}`,
    phone: r.phone,
    totalAmount: r.totalAmount,
    totalWeight: r.totalWeight,
    status: r.status,
    operatorName: r.operatorName,
    createdAt: r.createdAt,
    hasFront: !!r.idFrontPath,
    hasBack: !!r.idBackPath,
  }))
  return Response.json({ records })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canCreateRecycleRecords(session.role)) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const body = await req.json()
  const storeId = Number(body.storeId)
  const recordDate: string = (body.recordDate ?? '').trim()
  const customerName: string = (body.customerName ?? '').trim()
  const idNumber: string = (body.idNumber ?? '').trim()
  const phone: string = (body.phone ?? '').trim()
  const remarks: string = (body.remarks ?? '').trim()
  const consentAccepted: boolean = body.consentAccepted === true
  const items: ItemInput[] = Array.isArray(body.items) ? body.items : []

  // 登记人：下拉选中的姓名或"其他"时手填的姓名；session 登录名仍存入 operatorName 审计
  const operatorDisplayName: string = (body.operatorDisplayName ?? '').trim()

  // 付款方式 + 银行卡（B 方案：加密存全号）
  const paymentMethod: string = (body.paymentMethod ?? '').trim()
  const paymentOtherDesc: string = (body.paymentOtherDesc ?? '').trim()
  const bankName: string = (body.bankName ?? '').trim()
  const bankCardNumber: string = (body.bankCardNumber ?? '').replace(/\s+/g, '')

  if (!storeId) return Response.json({ error: '请选择门店' }, { status: 400 })
  if (!recordDate) return Response.json({ error: '请选择日期' }, { status: 400 })
  if (!customerName) return Response.json({ error: '请填写客户姓名' }, { status: 400 })
  if (!/^(\d{17}[\dXx]|\d{15})$/.test(idNumber)) {
    return Response.json({ error: '身份证号格式不正确' }, { status: 400 })
  }
  if (!/^\d{11}$/.test(phone)) {
    return Response.json({ error: '手机号必须为 11 位数字' }, { status: 400 })
  }
  if (!consentAccepted) {
    return Response.json({ error: '请确认已阅读并同意隐私政策' }, { status: 400 })
  }
  if (!operatorDisplayName) {
    return Response.json({ error: '请选择登记人' }, { status: 400 })
  }
  if (!paymentMethod || !ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    return Response.json({ error: '请选择付款方式' }, { status: 400 })
  }
  if (paymentMethod === 'other' && !paymentOtherDesc) {
    return Response.json({ error: '请填写付款方式说明' }, { status: 400 })
  }
  if (paymentMethod === 'bank') {
    if (!/^\d{12,19}$/.test(bankCardNumber)) {
      return Response.json({ error: '银行卡号应为 12-19 位数字' }, { status: 400 })
    }
    if (!bankName) {
      return Response.json({ error: '请填写银行名' }, { status: 400 })
    }
  }
  if (items.length === 0) {
    return Response.json({ error: '至少填写一条回购物品' }, { status: 400 })
  }
  for (const it of items) {
    if (!it.material || !ALLOWED_MATERIALS.includes(it.material)) {
      return Response.json({ error: '材料分类不合法' }, { status: 400 })
    }
    // purity 期望为百分比数字字符串（如 "99.20"），范围 0-100
    const pn = Number(it.purity)
    if (!it.purity || !Number.isFinite(pn) || pn < 0 || pn > 100) {
      return Response.json({ error: '成色必须为 0-100 之间的数字' }, { status: 400 })
    }
    if (!(it.weightG > 0) || !(it.unitPrice >= 0)) {
      return Response.json({ error: '物品条目填写不完整' }, { status: 400 })
    }
  }

  const isMinor = computeIsMinor(idNumber)
  if (isMinor) {
    return Response.json(
      { error: '未满 18 周岁需监护人陪同，请勿直接录入' },
      { status: 400 }
    )
  }

  const store = getStore(storeId)
  if (!store) return Response.json({ error: '门店不存在' }, { status: 400 })

  const idNumberEncrypted = encryptField(idNumber)
  const idNumberLast4 = extractIdLast4(idNumber)

  // 银行卡：卡号加密整存（B 方案），仅 boss 可解；另存后 4 位明文给店员对账用
  const bankCardEncrypted = paymentMethod === 'bank' ? encryptField(bankCardNumber) : ''
  const bankCardLast4 = paymentMethod === 'bank' ? bankCardNumber.slice(-4) : ''

  const totalWeight = items.reduce((s, i) => s + (Number(i.weightG) || 0), 0)
  const totalAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)

  const year = Number(recordDate.slice(2, 4)) // YY from YYYY-MM-DD

  const create = db.transaction(() => {
    const recordNo = nextRecordNo(storeId, store.shortName, year)
    const res = db
      .prepare(
        `INSERT INTO RecycleRecord (
          recordNo, recordDate, storeId,
          customerName, idNumberEncrypted, idNumberLast4, phone, isMinor,
          consentAccepted, consentAt,
          remarks, totalAmount, totalWeight,
          status, operatorUserId, operatorName, operatorDisplayName,
          paymentMethod, paymentOtherDesc,
          bankName, bankCardLast4, bankCardEncrypted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, datetime('now'), ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        recordNo,
        recordDate,
        storeId,
        customerName,
        idNumberEncrypted,
        idNumberLast4,
        phone,
        remarks,
        totalAmount,
        totalWeight,
        session.userId,
        session.name,
        operatorDisplayName,
        paymentMethod,
        paymentMethod === 'other' ? paymentOtherDesc : '',
        paymentMethod === 'bank' ? bankName : '',
        bankCardLast4,
        bankCardEncrypted
      )
    const recordId = Number(res.lastInsertRowid)
    const insertItem = db.prepare(
      `INSERT INTO RecycleItem (recordId, material, purity, weightG, unitPrice, amount, sortOrder)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    items.forEach((it, idx) => {
      // 成色规范化为 2 位小数字符串，和前端一致
      const purityStr = Number(it.purity).toFixed(2)
      insertItem.run(
        recordId,
        it.material,
        purityStr,
        Number(it.weightG),
        Number(it.unitPrice),
        Number(it.amount),
        idx
      )
    })
    return { recordId, recordNo }
  })

  const { recordId, recordNo } = create()
  return Response.json(
    { id: recordId, recordNo, idNumberMasked: maskIdNumber(idNumber) },
    { status: 201 }
  )
}
