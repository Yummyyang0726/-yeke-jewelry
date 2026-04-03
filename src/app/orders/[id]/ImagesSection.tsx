'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUploader } from '@/components/ImageUploader'

type ImageRecord = {
  id: number
  filePath: string
  imageType: string
}

type Props = {
  orderId: number
  initialImages: ImageRecord[]
  canUpload: boolean
}

export function ImagesSection({ orderId, initialImages, canUpload }: Props) {
  const [images, setImages] = useState<ImageRecord[]>(initialImages)

  const refImages = images.filter((i) => i.imageType === 'reference')
  const matImages = images.filter((i) => i.imageType === 'material')
  const cadImages = images.filter((i) => i.imageType === 'cad')

  function handleUploaded(newImgs: ImageRecord[]) {
    setImages((prev) => [...prev, ...newImgs])
  }

  function handleDeleted(id: number) {
    setImages((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <Card className="shadow-none border-gray-200">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm text-gray-700">图片</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        <div>
          <div className="text-xs font-medium text-gray-500 mb-2">客户参考图</div>
          {canUpload ? (
            <ImageUploader
              orderId={orderId}
              imageType="reference"
              existingImages={refImages}
              onUploaded={handleUploaded}
              onDeleted={handleDeleted}
            />
          ) : (
            <ReadonlyImages images={refImages} />
          )}
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 mb-2">来料照片</div>
          {canUpload ? (
            <ImageUploader
              orderId={orderId}
              imageType="material"
              existingImages={matImages}
              onUploaded={handleUploaded}
              onDeleted={handleDeleted}
            />
          ) : (
            <ReadonlyImages images={matImages} />
          )}
        </div>

        {cadImages.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">工厂CAD图</div>
            <ReadonlyImages images={cadImages} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ReadonlyImages({ images }: { images: ImageRecord[] }) {
  const [preview, setPreview] = useState<string | null>(null)
  if (images.length === 0) return <div className="text-xs text-gray-400">暂无图片</div>
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {images.map((img) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={img.id}
            src={img.filePath}
            alt=""
            className="aspect-square w-full object-cover rounded-lg cursor-pointer"
            onClick={() => setPreview(img.filePath)}
          />
        ))}
      </div>
      {preview && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setPreview(null)} className="absolute top-4 right-4 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white text-xl">✕</button>
        </div>
      )}
    </>
  )
}
