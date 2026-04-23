import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { canCreateRecycleRecords } from '@/lib/roles'
import { db, getRecord, getStore, nextRecordNo } from '@/lib/recycle-db'
import { encryptField } from '@/lib/encryption'

type Params = { params: Promise<{ id: string }> }

type ItemInput = {
  material: string
  purity: string
  weightG: number
  unitPrice: number
  amount: number
  sortOrder: number
}

const ALLOWED_MATERIALS = ['足金', 'K金', '铂金', '银', '其他']
const ALLOWED_PAYMENT_METHODS = ['bank', 'alipay', 'wechat', 'other']

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canCreateRecycleRecords(session.role)) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const { id } = await params
  const rid = Number(id)
  const record = getRecord(rid)
  if (!record) return Response.json({ error: '记录不存在' }, { status: 404 })
  if (record.status !== 'draft') {
    return Response.json({ error: '该记录已完成，无法重复提交' }, { status: 409 })
  }

  const body = await req.json()
  const storeId = Number(body.storeId)
  const recordDate: string = (body.recordDate ?? '').trim()
  const operatorDisplayName: string = (body.operatorDisplayName ?? '').trim()
  const paymentMethod: string = (body.paymentMethod ?? '').trim()
  const paymentOtherDesc: string = (body.paymentOtherDesc ?? '').trim()
  const bankName: string = (body.bankName ?? '').trim()
  const bankCardNumber: string = (body.bankCardNumber ?? '').replace(/\s+/g, '')
  const remarks: string = (body.remarks ?? '').trim()
  const items: ItemInput[] = Array.isArray(body.items) ? body.items : []

  // Validate
  if (!storeId) return Response.json({ error: '请选择门店' }, { status: 400 })
  if (!recordDate) return Response.json({ error: '请选择日期' }, { status: 400 })
  if (!operatorDisplayName) return Response.json({ error: '请选择登记人' }, { status: 400 })
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
    if (!bankName) return Response.json({ error: '请填写银行名' }, { status: 400 })
  }
  if (items.length === 0) {
    return Response.json({ error: '请填写至少一条回购明细' }, { status: 400 })
  }
  for (const it of items) {
    if (!it.material || !ALLOWED_MATERIALS.includes(it.material)) {
      return Response.json({ error: '材料分类不合法' }, { status: 400 })
    }
    const pn = Number(it.purity)
    if (!it.purity || !Number.isFinite(pn) || pn < 0 || pn > 100) {
      return Response.json({ error: '成色必须为 0-100 之间的数字' }, { status: 400 })
    }
    if (!(it.weightG > 0) || !(it.unitPrice >= 0)) {
      return Response.json({ error: '物品条目填写不完整' }, { status: 400 })
    }
  }

  const store = getStore(storeId)
  if (!store) return Response.json({ error: '门店不存在' }, { status: 400 })

  const bankCardEncrypted = paymentMethod === 'bank' ? encryptField(bankCardNumber) : ''
  const bankCardLast4 = paymentMethod === 'bank' ? bankCardNumber.slice(-4) : ''

  const totalWeight = items.reduce((s, i) => s + (Number(i.weightG) || 0), 0)
  const totalAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)

  // YY from recordDate (YYYY-MM-DD → last 2 digits of year)
  const year = Number(recordDate.slice(2, 4))

  const complete = db.transaction(() => {
    // Generate real record number
    const recordNo = nextRecordNo(storeId, store.shortName, year)

    // Update the draft record to completed
    db.prepare(`
      UPDATE RecycleRecord SET
        recordNo           = ?,
        status             = 'completed',
        storeId            = ?,
        recordDate         = ?,
        operatorUserId     = ?,
        operatorName       = ?,
        operatorDisplayName = ?,
        paymentMethod      = ?,
        paymentOtherDesc   = ?,
        bankName           = ?,
        bankCardLast4      = ?,
        bankCardEncrypted  = ?,
        totalWeight        = ?,
        totalAmount        = ?,
        remarks            = ?,
        updatedAt          = datetime('now')
      WHERE id = ? AND status = 'draft'
    `).run(
      recordNo,
      storeId,
      recordDate,
      session.userId,
      session.name,
      operatorDisplayName,
      paymentMethod,
      paymentMethod === 'other' ? paymentOtherDesc : '',
      paymentMethod === 'bank' ? bankName : '',
      bankCardLast4,
      bankCardEncrypted,
      totalWeight,
      totalAmount,
      remarks,
      rid
    )

    // Insert items
    const insertItem = db.prepare(`
      INSERT INTO RecycleItem (recordId, material, purity, weightG, unitPrice, amount, sortOrder)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    for (const it of items) {
      insertItem.run(
        rid,
        it.material,
        String(it.purity),
        Number(it.weightG),
        Number(it.unitPrice),
        Number(it.amount),
        it.sortOrder
      )
    }

    return recordNo
  })

  const recordNo = complete()
  return Response.json({ id: rid, recordNo }, { status: 200 })
}
