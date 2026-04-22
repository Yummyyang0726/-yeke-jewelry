import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { db, type RecycleRecordRow } from '@/lib/recycle-db'
import { canExportRecycleRecords } from '@/lib/roles'

/**
 * 导出 CSV（脱敏）— 仅老板。
 * 列：编号 / 日期 / 门店 / 客户姓名 / 脱敏身份证号 / 手机号 / 总重(g) / 总金额(元) / 经办人 / 状态 / 录入时间
 * 不包含：明文 ID、身份证照片 URL、签名照片 URL（安全红线）
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canExportRecycleRecords(session.role)) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const url = req.nextUrl
  const from = url.searchParams.get('from') || ''
  const to = url.searchParams.get('to') || ''
  const storeId = url.searchParams.get('storeId') || ''

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

  const rows = db
    .prepare(
      `SELECT r.*, s.name AS storeName, s.shortName AS storeShortName
       FROM RecycleRecord r
       JOIN RecycleStore s ON s.id = r.storeId
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY r.recordDate DESC, r.id DESC`
    )
    .all(...args) as (RecycleRecordRow & { storeName: string; storeShortName: string })[]

  const header = [
    '编号',
    '日期',
    '门店',
    '客户姓名',
    '身份证号(脱敏)',
    '手机号',
    '总重(g)',
    '总金额(元)',
    '经办人',
    '状态',
    '录入时间',
  ]

  const csvLines: string[] = []
  csvLines.push(header.map(csvCell).join(','))
  for (const r of rows) {
    csvLines.push(
      [
        r.recordNo,
        r.recordDate,
        r.storeName,
        r.customerName,
        `***${'*'.repeat(11)}${r.idNumberLast4}`,
        r.phone,
        r.totalWeight.toFixed(2),
        r.totalAmount.toFixed(2),
        r.operatorName,
        r.status,
        r.createdAt,
      ]
        .map(csvCell)
        .join(',')
    )
  }
  // 加 BOM 让 Excel 正确识别 UTF-8
  const body = '\uFEFF' + csvLines.join('\r\n')

  const today = new Date().toISOString().slice(0, 10)
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="recycle-${today}.csv"`,
    },
  })
}

function csvCell(v: string | number): string {
  const s = String(v ?? '')
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}
