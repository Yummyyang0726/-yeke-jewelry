import { NextRequest } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const orderId = parseInt(id)

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) return Response.json({ error: '订单不存在' }, { status: 404 })

  // Factory can only upload to their own orders
  if (session.role === 'factory' && order.factoryId !== session.factoryId) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]
  const imageType = (formData.get('imageType') as string) || 'reference'

  if (!files.length) {
    return Response.json({ error: '没有文件' }, { status: 400 })
  }

  // Factory can only upload CAD images
  if (session.role === 'factory' && imageType !== 'cad') {
    return Response.json({ error: '工厂只能上传CAD图' }, { status: 403 })
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', String(orderId))
  await mkdir(uploadDir, { recursive: true })

  const saved: Array<{ id: number; filePath: string; imageType: string }> = []

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue

    const ext = file.name.split('.').pop() ?? 'jpg'
    const filename = `${imageType}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
    const filepath = path.join(uploadDir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    const webPath = `/uploads/${orderId}/${filename}`

    const record = await prisma.orderImage.create({
      data: {
        orderId,
        imageType,
        filePath: webPath,
        uploadedBy: session.userId,
      },
    })
    saved.push({ id: record.id, filePath: webPath, imageType })
  }

  // If factory uploading CAD, advance status
  if (session.role === 'factory' && imageType === 'cad' && order.status === '待出图') {
    await prisma.order.update({ where: { id: orderId }, data: { status: 'CAD待确认' } })
    await prisma.statusLog.create({
      data: {
        orderId,
        fromStatus: '待出图',
        toStatus: 'CAD待确认',
        operatedBy: session.userId,
        note: '工厂上传CAD图',
      },
    })
  }

  return Response.json({ images: saved }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { imageId } = await req.json()

  const image = await prisma.orderImage.findUnique({ where: { id: imageId } })
  if (!image || image.orderId !== parseInt(id)) {
    return Response.json({ error: '图片不存在' }, { status: 404 })
  }

  // Factory can only delete their own uploads
  if (session.role === 'factory' && image.uploadedBy !== session.userId) {
    return Response.json({ error: '无权限' }, { status: 403 })
  }

  // Delete file
  try {
    const { unlink } = await import('fs/promises')
    await unlink(path.join(process.cwd(), 'public', image.filePath))
  } catch {
    // ignore if file not found
  }

  await prisma.orderImage.delete({ where: { id: imageId } })
  return Response.json({ ok: true })
}
