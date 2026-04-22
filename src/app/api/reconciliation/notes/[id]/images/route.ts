import { NextRequest } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { uploadToCOS, deleteFromCOS, getCOSKeyFromUrl } from '@/lib/cos'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'factory') return Response.json({ error: '无权限' }, { status: 403 })

  const { id } = await params
  const noteId = parseInt(id)

  const note = await prisma.deliveryNote.findUnique({ where: { id: noteId } })
  if (!note) return Response.json({ error: '出库单不存在' }, { status: 404 })

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  if (!files.length) {
    return Response.json({ error: '没有文件' }, { status: 400 })
  }

  const saved: Array<{ id: number; filePath: string }> = []

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue

    const ext = file.name.split('.').pop() ?? 'jpg'
    const filename = `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
    const cosKey = `delivery-notes/${noteId}/${filename}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const cosUrl = await uploadToCOS(buffer, cosKey, file.type)

    const record = await prisma.deliveryNoteImage.create({
      data: {
        deliveryNoteId: noteId,
        filePath: cosUrl,
        uploadedBy: session.userId,
      },
    })
    saved.push({ id: record.id, filePath: cosUrl })
  }

  return Response.json({ images: saved }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'factory') return Response.json({ error: '无权限' }, { status: 403 })

  const { id } = await params
  const { imageId } = await req.json()

  const image = await prisma.deliveryNoteImage.findUnique({ where: { id: imageId } })
  if (!image || image.deliveryNoteId !== parseInt(id)) {
    return Response.json({ error: '图片不存在' }, { status: 404 })
  }

  const cosKey = getCOSKeyFromUrl(image.filePath)
  if (cosKey) {
    try {
      await deleteFromCOS(cosKey)
    } catch {
      // ignore if file not found on COS
    }
  }

  await prisma.deliveryNoteImage.delete({ where: { id: imageId } })
  return Response.json({ ok: true })
}
