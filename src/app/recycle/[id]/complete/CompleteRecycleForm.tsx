'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Check, Loader2, CreditCard } from 'lucide-react'
import { SignaturePad } from '@/components/SignaturePad'
import { getStaffForStore, OTHER_OPTION } from '@/lib/recycle-staff'

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentMethod = '' | 'bank' | 'alipay' | 'wechat' | 'other'

type Item = {
  key: string
  material: string
  purity: string
  weightG: string
  unitPrice: string
}

type Store = { id: number; name: string; shortName: string }

const MATERIAL_OPTIONS = ['足金', 'K金', '铂金', '银', '其他']

const PAYMENT_OPTIONS: { value: Exclude<PaymentMethod, ''>; label: string }[] = [
  { value: 'bank', label: '银行卡' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' },
  { value: 'other', label: '其他' },
]

function newItem(): Item {
  return {
    key: Math.random().toString(36).slice(2),
    material: '足金',
    purity: '',
    weightG: '',
    unitPrice: '',
  }
}

function computeAmount(w: string, p: string): number {
  const wn = Number(w)
  const pn = Number(p)
  if (!(wn > 0) || !(pn >= 0)) return 0
  return Number((wn * pn).toFixed(2))
}

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  recordId: number
  customerName: string
  phone: string
  idNumberMasked: string
  hasFront: boolean
  defaultStoreId: number
  defaultStoreShortName: string
  stores: Store[]
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CompleteRecycleForm({
  recordId,
  customerName,
  phone,
  idNumberMasked,
  hasFront,
  defaultStoreId,
  defaultStoreShortName,
  stores,
}: Props) {
  const router = useRouter()

  const [storeId, setStoreId] = useState(String(defaultStoreId))
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10))
  const [items, setItems] = useState<Item[]>([newItem()])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('')
  const [paymentOtherDesc, setPaymentOtherDesc] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankCardNumber, setBankCardNumber] = useState('')
  const [operatorSelect, setOperatorSelect] = useState('')
  const [operatorOther, setOperatorOther] = useState('')
  const [remarks, setRemarks] = useState('')
  const [signature, setSignature] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Staff list based on selected store
  const selectedStore = useMemo(
    () => stores.find((s) => String(s.id) === storeId),
    [stores, storeId]
  )
  const storeShortName = selectedStore?.shortName ?? defaultStoreShortName
  const staffList = useMemo(() => getStaffForStore(storeShortName), [storeShortName])

  // Items helpers
  function updateItem(key: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }
  function removeItem(key: string) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((it) => it.key !== key)))
  }

  const totalWeight = useMemo(
    () => items.reduce((s, it) => s + (Number(it.weightG) || 0), 0),
    [items]
  )
  const totalAmount = useMemo(
    () => items.reduce((s, it) => s + computeAmount(it.weightG, it.unitPrice), 0),
    [items]
  )

  async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    return (await fetch(dataUrl)).blob()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    // Validate
    if (!storeId) return toast.error('请选择门店')
    if (!operatorSelect) return toast.error('请选择登记人')
    const operatorDisplayName =
      operatorSelect === OTHER_OPTION ? operatorOther.trim() : operatorSelect
    if (!operatorDisplayName) return toast.error('请填写登记人姓名')
    if (!paymentMethod) return toast.error('请选择付款方式')
    if (paymentMethod === 'other' && !paymentOtherDesc.trim()) {
      return toast.error('请填写付款方式说明')
    }
    const cardDigits = bankCardNumber.replace(/\D/g, '')
    if (paymentMethod === 'bank') {
      if (!bankName.trim()) return toast.error('请填写银行名')
      if (!/^\d{12,19}$/.test(cardDigits)) return toast.error('银行卡号应为 12-19 位数字')
    }
    if (items.length === 0) return toast.error('请填写回收明细')
    for (const it of items) {
      const pn = Number(it.purity)
      if (!it.purity || !Number.isFinite(pn) || pn < 0 || pn > 100) {
        return toast.error('成色需填 0-100 之间的数字')
      }
      if (!(Number(it.weightG) > 0) || !(Number(it.unitPrice) >= 0)) {
        return toast.error('物品条目未填写完整')
      }
    }

    setSubmitting(true)
    try {
      const body = {
        storeId: Number(storeId),
        recordDate,
        operatorDisplayName,
        paymentMethod,
        paymentOtherDesc: paymentMethod === 'other' ? paymentOtherDesc.trim() : '',
        bankName: paymentMethod === 'bank' ? bankName.trim() : '',
        bankCardNumber: paymentMethod === 'bank' ? cardDigits : '',
        remarks: remarks.trim(),
        items: items.map((it, idx) => ({
          material: it.material,
          purity: Number(it.purity).toFixed(2),
          weightG: Number(it.weightG),
          unitPrice: Number(it.unitPrice),
          amount: computeAmount(it.weightG, it.unitPrice),
          sortOrder: idx,
        })),
      }

      const res = await fetch(`/api/recycle/${recordId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '提交失败')
        return
      }

      // Upload signature if captured
      if (signature) {
        try {
          const sigBlob = await dataUrlToBlob(signature)
          const fd = new FormData()
          fd.append('kind', 'signature')
          fd.append('file', sigBlob, 'signature.png')
          await fetch(`/api/recycle/${recordId}/images`, { method: 'POST', body: fd })
        } catch {
          toast.warning('签名图片未能上传，可在详情页补传')
        }
      }

      toast.success(`已完成登记 ${data.recordNo}`)
      router.push(`/recycle/${recordId}/receipt`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── 客户信息（只读） ─────────────────────────────────────────────────── */}
      <section className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-1.5">
        <h3 className="text-xs font-medium text-amber-900 mb-2">客户自助提交信息</h3>
        <Row k="姓名" v={customerName} />
        <Row k="身份证" v={idNumberMasked} mono />
        <Row k="手机号" v={phone} mono />
        <Row k="身份证正面" v={hasFront ? '✓ 已上传' : '未上传'} />
      </section>

      {/* ── 门店 + 日期 + 登记人 ─────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">门店 *</label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full h-9 text-sm rounded-md border border-gray-300 bg-white px-2"
              required
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">日期 *</label>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              className="w-full h-9 text-sm rounded-md border border-gray-300 bg-white px-2"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">登记人 *</label>
          <select
            value={operatorSelect}
            onChange={(e) => setOperatorSelect(e.target.value)}
            className="w-full h-9 text-sm rounded-md border border-gray-300 bg-white px-2"
            required
          >
            <option value="">请选择…</option>
            {staffList.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {operatorSelect === OTHER_OPTION && (
            <input
              value={operatorOther}
              onChange={(e) => setOperatorOther(e.target.value)}
              placeholder="请填写登记人姓名"
              className="mt-2 w-full h-9 text-sm rounded-md border border-gray-300 bg-white px-2"
              required
            />
          )}
        </div>
      </section>

      {/* ── 回收明细 ────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            回收明细 <span className="text-xs text-gray-400 font-normal">· 先测价</span>
          </h3>
          <button
            type="button"
            onClick={() => setItems((p) => [...p, newItem()])}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white text-xs px-2 py-1 hover:bg-gray-50"
          >
            <Plus className="w-3.5 h-3.5" /> 添加一条
          </button>
        </div>
        <div className="space-y-3">
          {items.map((it, idx) => {
            const amount = computeAmount(it.weightG, it.unitPrice)
            return (
              <div key={it.key} className="rounded-md border border-gray-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">#{idx + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(it.key)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-0.5">材料</label>
                    <select
                      value={it.material}
                      onChange={(e) => updateItem(it.key, { material: e.target.value })}
                      className="w-full h-8 text-sm rounded-md border border-gray-300 bg-white px-1.5"
                    >
                      {MATERIAL_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-0.5">
                      成色(%) <span className="text-gray-300">光谱仪</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={it.purity}
                      onChange={(e) => updateItem(it.key, { purity: e.target.value })}
                      className="w-full h-8 text-sm rounded-md border border-gray-300 bg-white px-1.5 font-mono"
                      placeholder="99.20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-0.5">重量(g)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.weightG}
                      onChange={(e) => updateItem(it.key, { weightG: e.target.value })}
                      className="w-full h-8 text-sm rounded-md border border-gray-300 bg-white px-1.5 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-0.5">单价(元/g)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={it.unitPrice}
                      onChange={(e) => updateItem(it.key, { unitPrice: e.target.value })}
                      className="w-full h-8 text-sm rounded-md border border-gray-300 bg-white px-1.5 font-mono"
                      required
                    />
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  金额 <span className="font-mono text-gray-900">¥{amount.toFixed(2)}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3 text-sm">
          <span className="text-gray-500">
            合计 <span className="font-mono text-gray-900">{totalWeight.toFixed(2)}g</span>
          </span>
          <span className="font-medium text-gray-900">¥{totalAmount.toFixed(2)}</span>
        </div>
      </section>

      {/* ── 付款方式 ────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-900">付款方式 *</h3>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_OPTIONS.map((opt) => {
            const active = paymentMethod === opt.value
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => setPaymentMethod(opt.value)}
                className={`h-9 text-sm rounded-md border transition ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        {paymentMethod === 'other' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">付款方式说明 *</label>
            <input
              value={paymentOtherDesc}
              onChange={(e) => setPaymentOtherDesc(e.target.value)}
              placeholder="如：现金、商户记账等"
              className="w-full h-9 text-sm rounded-md border border-gray-300 bg-white px-2"
              required
            />
          </div>
        )}
        {paymentMethod === 'bank' && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-3">
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <CreditCard className="w-3.5 h-3.5" /> 银行卡信息
            </span>
            <div>
              <label className="block text-[11px] text-gray-400 mb-0.5">银行 *</label>
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="如：工商银行"
                className="w-full h-9 text-sm rounded-md border border-gray-300 bg-white px-2"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-0.5">
                卡号 * <span className="text-gray-300">12-19 位</span>
              </label>
              <input
                value={bankCardNumber}
                onChange={(e) =>
                  setBankCardNumber(e.target.value.replace(/\D/g, '').slice(0, 19))
                }
                inputMode="numeric"
                autoComplete="off"
                placeholder="手填卡号"
                className="w-full h-9 text-sm rounded-md border border-gray-300 bg-white px-2 font-mono"
                required
              />
            </div>
          </div>
        )}
      </section>

      {/* ── 备注 ────────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-xs text-gray-500 mb-1">备注</label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={2}
          className="w-full text-sm rounded-md border border-gray-300 bg-white px-2 py-1.5"
        />
      </section>

      {/* ── 签名 ────────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
        <h3 className="text-sm font-medium text-gray-900">客户签名</h3>
        <SignaturePad onChange={setSignature} />
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-11 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> 提交中…
          </>
        ) : (
          <>
            <Check className="w-4 h-4" /> 完成登记
          </>
        )}
      </button>
    </form>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-amber-700 shrink-0">{k}</span>
      <span className={`text-sm text-gray-900 text-right ${mono ? 'font-mono' : ''}`}>{v}</span>
    </div>
  )
}
