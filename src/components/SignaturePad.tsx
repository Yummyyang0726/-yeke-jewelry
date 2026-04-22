'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  onChange: (dataUrl: string | null) => void
  height?: number
}

/**
 * HTML5 canvas 电子签名板。Hi-DPI 友好，支持鼠标/触屏/手写笔。
 * 导出 PNG dataURL（透明底），调用方应在 pointerup 之后用。
 */
export function SignaturePad({ onChange, height = 180 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastRef = useRef<{ x: number; y: number } | null>(null)
  const [hasInk, setHasInk] = useState(false)

  // Setup canvas for hi-DPI
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.floor(rect.width * ratio)
    canvas.height = Math.floor(rect.height * ratio)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 2
  }, [])

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handleDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastRef.current = pointerPos(e)
  }

  function handleMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const last = lastRef.current
    if (!ctx || !last) return
    const p = pointerPos(e)
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    lastRef.current = p
    if (!hasInk) setHasInk(true)
  }

  function handleUp(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false
    lastRef.current = null
    const canvas = canvasRef.current
    if (canvas && hasInk) {
      onChange(canvas.toDataURL('image/png'))
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const ratio = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio)
    setHasInk(false)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div
        className="border border-gray-300 rounded-md bg-white"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none cursor-crosshair"
          style={{ display: 'block' }}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {hasInk ? '已签名' : '请在此处签名'}
        </span>
        <button
          type="button"
          onClick={clear}
          className="text-xs text-gray-600 underline hover:text-gray-900"
        >
          清除重签
        </button>
      </div>
    </div>
  )
}
