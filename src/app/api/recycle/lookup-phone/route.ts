import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { canCreateRecycleRecords } from '@/lib/roles'
import { db } from '@/lib/recycle-db'
import { extractIdLast4, safeDecryptField } from '@/lib/encryption'

/**
 * 老客户手机号查询：输入身份证号 → 返回上次留的手机（脱敏展示 + 原值）。
 *
 * 设计取舍：
 *  - 通过 idNumberLast4 索引命中候选（O(log n)），再对候选解密比对 → 避免全表解密
 *  - 返回体含 phone 明文（店员填回表单要用），但不含身份证明文
 *  - 命中上限 20 条候选，实践中绝大多数一次命中
 *
 * 安全：仅允许能创建回购记录的角色调用（boss / employee）。
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canCreateRecycleRecords(session.role)) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const idNumber = (req.nextUrl.searchParams.get('idNumber') || '').trim()
  if (!/^(\d{17}[\dXx]|\d{15})$/.test(idNumber)) {
    return Response.json({ error: '身份证号格式不正确' }, { status: 400 })
  }

  const last4 = extractIdLast4(idNumber)
  if (!last4) return Response.json({ found: false })

  const candidates = db
    .prepare(
      `SELECT idNumberEncrypted, phone, customerName, recordDate, createdAt
       FROM RecycleRecord
       WHERE idNumberLast4 = ?
       ORDER BY createdAt DESC
       LIMIT 20`
    )
    .all(last4) as {
    idNumberEncrypted: string
    phone: string
    customerName: string
    recordDate: string
    createdAt: string
  }[]

  const target = idNumber.toUpperCase()
  for (const c of candidates) {
    const r = safeDecryptField(c.idNumberEncrypted)
    if (!r.ok) continue
    if (r.value.trim().toUpperCase() !== target) continue
    // 脱敏展示：138****5678
    const phone = c.phone
    const phoneMasked =
      phone.length === 11 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone
    return Response.json({
      found: true,
      phone,
      phoneMasked,
      customerName: c.customerName,
      lastRecordDate: c.recordDate,
    })
  }

  return Response.json({ found: false })
}
