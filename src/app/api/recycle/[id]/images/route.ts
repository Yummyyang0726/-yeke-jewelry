import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { db, getRecord } from '@/lib/recycle-db'
import { canCreateRecycleRecords, canReadRecycleRecords } from '@/lib/roles'
import { uploadPrivateToCOS } from '@/lib/cos'

type Params = { params: Promise<{ id: string }> }

const KIND_TO_COL: Record<string, 'idFrontPath' | 'idBackPath' | 'signaturePath' | 'bankCardPath'> = {
  front: 'idFrontPath',
  back: 'idBackPath',
  signature: 'signaturePath',
  bankcard: 'bankCardPath',
}

/**
 * 上传身份证正反面 / 电子签名 到私有 COS。
 * multipart/form-data：
 *   - file: Blob（image/*）
 *   - kind: 'front' | 'back' | 'signature'
 * 只有该记录的经办人或老板可以上传。上传后把 COS key 写回 RecycleRecord 的对应字段。
 */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canCreateRecycleRecords(session.role)) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const { id } = await params
  const rid = Number(id)
  const record = getRecord(rid)
  if (!record) return Response.json({ error: '记录不存在' }, { status: 404 })

  // 只有经办人本人或老板可以上传；其他员工即便有创建权限也不能改他人记录
  const isOwner = record.operatorUserId === session.userId
  const isBoss = canReadRecycleRecords(session.role)
  if (!isOwner && !isBoss) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const form = await req.formData()
  const kind = String(form.get('kind') || '')
  const file = form.get('file') as File | null
  const col = KIND_TO_COL[kind]
  if (!col) return Response.json({ error: 'kind 必须为 front/back/signature/bankcard' }, { status: 400 })
  if (!file) return Response.json({ error: '缺少文件' }, { status: 400 })
  if (!file.type.startsWith('image/')) {
    return Response.json({ error: '只接受图片文件' }, { status: 400 })
  }
  // 10MB cap — ID 照片压缩后一般 < 2MB，签名 PNG 更小
  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: '文件过大（>10MB）' }, { status: 400 })
  }

  const ext = file.type === 'image/png' ? 'png' : file.name.split('.').pop() || 'jpg'
  const key = `recycle/${rid}/${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await uploadPrivateToCOS(buffer, key, file.type)

  db.prepare(
    `UPDATE RecycleRecord SET ${col} = ?, updatedAt = datetime('now') WHERE id = ?`
  ).run(key, rid)

  return Response.json({ ok: true, kind, key }, { status: 201 })
}
