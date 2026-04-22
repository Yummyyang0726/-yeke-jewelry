'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Camera, ImagePlus, X, Loader2, ZoomIn } from 'lucide-react'

type ImageRecord = {
  id: number
  filePath: string
  imageType: string
}

type Props = {
  orderId: number
  imageType: 'reference' | 'material' | 'cad'
  existingImages?: ImageRecord[]
  onUploaded?: (images: ImageRecord[]) => void
  onDeleted?: (imageId: number) => void
  label?: string
  maxCount?: number
  allowCamera?: boolean
}

export function ImageUploader({
  orderId,
  imageType,
  existingImages = [],
  onUploaded,
  onDeleted,
  label,
  maxCount = 9,
  allowCamera = true,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const canUpload = existingImages.length < maxCount

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (canUpload) setDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    if (!canUpload) return
    const files = e.dataTransfer.files
    if (files.length > 0) handleFiles(files)
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('imageType', imageType)
      for (const file of Array.from(files)) {
        fd.append('files', file)
      }
      const res = await fetch(`/api/orders/${orderId}/images`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '上传失败')
        return
      }
      toast.success(`上传成功`)
      onUploaded?.(data.images)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (cameraInputRef.current) cameraInputRef.current.value = ''
    }
  }

  async function handleDelete(imageId: number) {
    if (!confirm('删除这张图片？')) return
    const res = await fetch(`/api/orders/${orderId}/images`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error ?? '删除失败')
      return
    }
    onDeleted?.(imageId)
  }

  return (
    <div>
      {label && <div className="text-xs text-gray-500 mb-2">{label}</div>}

      <div
        className={`grid grid-cols-3 gap-2 rounded-lg transition-colors ${dragging ? 'bg-primary/10 ring-2 ring-primary/30' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {existingImages.map((img) => (
          <div key={img.id} className="relative aspect-square group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.filePath}
              alt=""
              className="w-full h-full object-cover rounded-lg cursor-pointer"
              onClick={() => setPreview(img.filePath)}
            />
            <button
              onClick={() => handleDelete(img.id)}
              className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-white" />
            </button>
            <button
              onClick={() => setPreview(img.filePath)}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
            </button>
          </div>
        ))}

        {canUpload && (
          <>
            {/* Album picker */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-xs">相册</span>
                </>
              )}
            </button>

            {/* Camera capture */}
            {allowCamera && (
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
                <span className="text-xs">拍照</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Lightbox */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  )
}
