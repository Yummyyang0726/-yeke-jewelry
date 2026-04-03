'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUploader } from '@/components/ImageUploader'
import { CheckCircle } from 'lucide-react'

type ImageRecord = {
  id: number
  filePath: string
  imageType: string
}

type Props = {
  orderId: number
  initialCadImages: ImageRecord[]
}

export function CadUploadSection({ orderId, initialCadImages }: Props) {
  const router = useRouter()
  const [images, setImages] = useState<ImageRecord[]>(initialCadImages)
  const [statusAdvanced, setStatusAdvanced] = useState(false)

  function handleUploaded(newImgs: ImageRecord[]) {
    setImages((prev) => [...prev, ...newImgs])
    // Status is auto-advanced by API on first CAD upload when status is '待出图'
    if (!statusAdvanced) {
      setStatusAdvanced(true)
      setTimeout(() => router.refresh(), 500)
    }
  }

  function handleDeleted(id: number) {
    setImages((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <Card className="shadow-none border-amber-200 mb-4">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          上传CAD设计图
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className="text-xs text-gray-500 mb-3">
          上传后订单状态自动变为「CAD待确认」，等待门店确认
        </p>
        <ImageUploader
          orderId={orderId}
          imageType="cad"
          existingImages={images}
          onUploaded={handleUploaded}
          onDeleted={handleDeleted}
          allowCamera={true}
        />
      </CardContent>
    </Card>
  )
}
