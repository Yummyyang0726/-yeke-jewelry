'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

export function ConfirmCadButton({ orderId }: { orderId: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (!confirm('确认CAD图无误，开始生产？')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus: '生产中', note: '门店确认CAD，开始生产' }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? '操作失败')
        return
      }
      toast.success('已确认CAD，订单进入生产中')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleConfirm}
      disabled={loading}
      className="w-full mb-4 bg-primary hover:bg-primary/90 h-11 gap-2"
    >
      <CheckCircle className="w-4 h-4" />
      {loading ? '处理中...' : '确认CAD，开始制作'}
    </Button>
  )
}
