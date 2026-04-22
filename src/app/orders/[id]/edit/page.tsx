import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/AppShell'
import { EditOrderForm } from './EditOrderForm'
import { ImagesSection } from '../ImagesSection'

type Params = { params: Promise<{ id: string }> }

export default async function EditOrderPage({ params }: Params) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'boss') redirect('/dashboard')

  const { id } = await params
  const order = await prisma.order.findUnique({
    where: { id: parseInt(id) },
    include: { stones: true, materials: true, images: { orderBy: { createdAt: 'asc' } } },
  })

  if (!order) notFound()

  const [stores, factories] = await Promise.all([
    prisma.store.findMany({ orderBy: { id: 'asc' } }),
    prisma.factory.findMany({ orderBy: { id: 'asc' } }),
  ])

  return (
    <AppShell userName={session.name} role={session.role} title="编辑订单" hideBottomTabs>
      <EditOrderForm
        order={order}
        stores={stores}
        factories={factories}
        imagesSlot={
          <ImagesSection
            orderId={order.id}
            initialImages={order.images}
            canUpload={true}
          />
        }
      />
    </AppShell>
  )
}
