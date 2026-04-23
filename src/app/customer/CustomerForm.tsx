'use client'

import { useRef, useState } from 'react'
import { Camera, CheckCircle, Loader2 } from 'lucide-react'
import { compressImage } from '@/lib/client-image'

type Store = { id: number; name: string }

export function CustomerForm({ stores }: { stores: Store[] }) {
  const [storeId, setStoreId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [backPreview, setBackPreview] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const frontInputRef = useRef<HTMLInputElement>(null)
  const backInputRef = useRef<HTMLInputElement>(null)

  async function onPickPhoto(
    raw: File | null,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) {
    if (!raw) {
      setFile(null)
      setPreview(null)
      return
    }
    const f = await compressImage(raw)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError('')

    if (!storeId) return setError('请选择门店')
    if (!customerName.trim()) return setError('请填写姓名')
    if (!/^(\d{17}[\dXx]|\d{15})$/.test(idNumber.trim()))
      return setError('身份证号格式不正确（18位或15位）')
    if (!/^\d{11}$/.test(phone.trim())) return setError('手机号必须为11位数字')
    if (!consent) return setError('请勾选同意后继续')

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('storeId', storeId)
      fd.append('customerName', customerName.trim())
      fd.append('idNumber', idNumber.trim())
      fd.append('phone', phone.trim())
      if (frontFile) fd.append('front', frontFile)
      if (backFile) fd.append('back', backFile)

      const res = await fetch('/api/customer/submit', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || '提交失败，请重试')
        return
      }
      setSuccess(true)
    } catch {
      setError('网络异常，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">信息已提交</h2>
        <p className="text-sm text-gray-500">请稍候，店员将为您服务</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 顶部说明 */}
      <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-4 py-3">
        <p className="text-xs text-amber-900 font-medium mb-0.5">📋 登记须知</p>
        <p className="text-xs text-amber-800/80">
          根据合规要求，旧金回购需实名登记，信息加密保存仅用于备查。
        </p>
      </div>

      {/* 门店 + 基本信息 */}
      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">门店 *</label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full h-10 text-sm rounded-md border border-gray-300 bg-white px-3"
            required
          >
            <option value="">请选择门店…</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">姓名 *</label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full h-10 text-sm rounded-md border border-gray-300 bg-white px-3"
            placeholder="请输入真实姓名"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">身份证号 *</label>
          <input
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value.trim())}
            inputMode="numeric"
            autoComplete="off"
            className="w-full h-10 text-sm rounded-md border border-gray-300 bg-white px-3 font-mono"
            placeholder="18位身份证号"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">手机号 *</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.trim())}
            inputMode="numeric"
            className="w-full h-10 text-sm rounded-md border border-gray-300 bg-white px-3 font-mono"
            maxLength={11}
            placeholder="11位手机号"
            required
          />
        </div>
      </section>

      {/* 身份证照片（可选） */}
      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-900">
          身份证照片{' '}
          <span className="text-xs text-gray-400 font-normal">· 可选，方便店员核验</span>
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <PhotoSlot
            label="正面"
            preview={frontPreview}
            inputRef={frontInputRef}
            onPick={(f) => onPickPhoto(f, setFrontFile, setFrontPreview)}
          />
          <PhotoSlot
            label="背面"
            preview={backPreview}
            inputRef={backInputRef}
            onPick={(f) => onPickPhoto(f, setBackFile, setBackPreview)}
          />
        </div>
      </section>

      {/* 同意 */}
      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            本人确认提供的信息真实有效，并同意商户出于《反洗钱法》《旧货流通管理办法》合规要求保存本次回购交易信息。
          </span>
        </label>
      </section>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-11 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> 提交中…
          </>
        ) : (
          '提交信息'
        )}
      </button>
    </form>
  )
}

function PhotoSlot({
  label,
  preview,
  inputRef,
  onPick,
}: {
  label: string
  preview: string | null
  inputRef: React.RefObject<HTMLInputElement | null>
  onPick: (f: File | null) => void
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative aspect-[3/2] w-full rounded-md border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center text-gray-400 hover:border-gray-400"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-xs">
            <Camera className="w-5 h-5" />
            <span>拍照 / 选择</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
