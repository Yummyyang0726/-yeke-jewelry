'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Camera, Check, Loader2, Mic, UserCheck, CreditCard } from 'lucide-react'
import { SignaturePad } from '@/components/SignaturePad'
import { getStaffForStore, OTHER_OPTION } from '@/lib/recycle-staff'
import { compressImage } from '@/lib/client-image'

type Store = { id: number; name: string; shortName: string }

type Item = {
  key: string
  material: string // 材料分类：足金 / K金 / 铂金 / 银 / 其他
  purity: string // 光谱仪实测成色百分比（字符串，便于输入中保留尾随小数点等）
  weightG: string
  unitPrice: string
}

type PaymentMethod = '' | 'bank' | 'alipay' | 'wechat' | 'other'

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

function formatCardNumber(digits: string): string {
  // 每 4 位一空格显示（存储仍去空格）
  const clean = digits.replace(/\D/g, '').slice(0, 19)
  return clean.replace(/(.{4})/g, '$1 ').trim()
}

export function NewRecycleForm({ stores }: { stores: Store[] }) {
  const router = useRouter()
  const [storeId, setStoreId] = useState<string>(stores[0]?.id?.toString() ?? '')
  const [recordDate, setRecordDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [customerName, setCustomerName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [remarks, setRemarks] = useState('')
  const [consent, setConsent] = useState(false)
  const [items, setItems] = useState<Item[]>([newItem()])
  const [signature, setSignature] = useState<string | null>(null)

  // 登记人：下拉 + "其他"时弹手填
  const [operatorSelect, setOperatorSelect] = useState<string>('')
  const [operatorOther, setOperatorOther] = useState<string>('')

  // 付款方式 + 银行卡
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('')
  const [paymentOtherDesc, setPaymentOtherDesc] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankCardNumber, setBankCardNumber] = useState('') // 纯数字字符串
  const [bankcardFile, setBankcardFile] = useState<File | null>(null)
  const [bankcardPreview, setBankcardPreview] = useState<string | null>(null)
  const bankcardInputRef = useRef<HTMLInputElement>(null)
  const [bankOcr, setBankOcr] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ok'; filled: { cardNumber: boolean; bankName: boolean } }
    | { status: 'error'; message: string }
  >({ status: 'idle' })

  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [backPreview, setBackPreview] = useState<string | null>(null)
  const frontInputRef = useRef<HTMLInputElement>(null)
  const backInputRef = useRef<HTMLInputElement>(null)

  const [submitting, setSubmitting] = useState(false)
  // 反面缺失软警告：首次提交时弹 toast 并置位，再次提交才真正走
  const [backSkipConfirmed, setBackSkipConfirmed] = useState(false)

  // OCR 状态：触发于正面照选定后
  const [ocr, setOcr] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ok'; fieldsFromOcr: { name: boolean; idNumber: boolean } }
    | { status: 'error'; message: string }
  >({ status: 'idle' })

  // 老客户手机号查询结果（招 1）
  const [lookup, setLookup] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'found'; phone: string; phoneMasked: string; lastRecordDate: string; used: boolean }
    | { status: 'notfound' }
  >({ status: 'idle' })

  // 当前选中门店（用于取对应员工名单）
  const selectedStore = useMemo(
    () => stores.find((s) => String(s.id) === storeId),
    [stores, storeId]
  )
  const staffList = useMemo(
    () => (selectedStore ? getStaffForStore(selectedStore.shortName) : [OTHER_OPTION]),
    [selectedStore]
  )
  // 切换门店时，如之前选中的名字不在新列表里，重置登记人选择
  useEffect(() => {
    if (operatorSelect && !staffList.includes(operatorSelect)) {
      setOperatorSelect('')
      setOperatorOther('')
    }
  }, [staffList, operatorSelect])

  // 身份证号完整（18 位合法）后自动查历史手机号
  useEffect(() => {
    const id = idNumber.trim()
    if (!/^(\d{17}[\dXx]|\d{15})$/.test(id)) {
      setLookup({ status: 'idle' })
      return
    }
    let cancelled = false
    setLookup({ status: 'loading' })
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/recycle/lookup-phone?idNumber=${encodeURIComponent(id)}`)
        if (cancelled) return
        if (!res.ok) {
          setLookup({ status: 'idle' })
          return
        }
        const data = await res.json()
        if (cancelled) return
        if (data.found) {
          setLookup({
            status: 'found',
            phone: data.phone,
            phoneMasked: data.phoneMasked,
            lastRecordDate: data.lastRecordDate,
            used: false,
          })
        } else {
          setLookup({ status: 'notfound' })
        }
      } catch {
        if (!cancelled) setLookup({ status: 'idle' })
      }
    }, 250) // 防抖 250ms
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [idNumber])

  function applyLookupPhone() {
    if (lookup.status !== 'found') return
    setPhone(lookup.phone)
    setLookup({ ...lookup, used: true })
  }

  const totalWeight = useMemo(
    () => items.reduce((s, it) => s + (Number(it.weightG) || 0), 0),
    [items]
  )
  const totalAmount = useMemo(
    () => items.reduce((s, it) => s + computeAmount(it.weightG, it.unitPrice), 0),
    [items]
  )

  function updateItem(key: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((it) => it.key !== key)))
  }

  async function runOcr(file: File) {
    setOcr({ status: 'loading' })
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/recycle/ocr-idcard', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setOcr({ status: 'error', message: data.error || 'OCR 识别失败，请手填' })
        return
      }
      // 只在店员尚未手填时回填，避免覆盖已修改的值
      const filled = { name: false, idNumber: false }
      if (data.name && !customerName.trim()) {
        setCustomerName(data.name)
        filled.name = true
      }
      if (data.idNumber && !idNumber.trim()) {
        setIdNumber(data.idNumber)
        filled.idNumber = true
      }
      setOcr({ status: 'ok', fieldsFromOcr: filled })
    } catch {
      setOcr({ status: 'error', message: '网络异常，OCR 跳过，请手填' })
    }
  }

  async function runBankOcr(file: File) {
    setBankOcr({ status: 'loading' })
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/recycle/ocr-bankcard', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBankOcr({ status: 'error', message: data.error || '银行卡识别失败，请手填' })
        return
      }
      const filled = { cardNumber: false, bankName: false }
      if (data.cardNumber && !bankCardNumber.trim()) {
        setBankCardNumber(data.cardNumber)
        filled.cardNumber = true
      }
      if (data.bankName && !bankName.trim()) {
        setBankName(data.bankName)
        filled.bankName = true
      }
      setBankOcr({ status: 'ok', filled })
    } catch {
      setBankOcr({ status: 'error', message: '网络异常，OCR 跳过，请手填' })
    }
  }

  async function onPickFront(raw: File | null) {
    if (!raw) {
      setFrontFile(null)
      setFrontPreview(null)
      setOcr({ status: 'idle' })
      return
    }
    // 压缩后同一份用于预览 / 上传 / OCR
    const f = await compressImage(raw)
    setFrontFile(f)
    setFrontPreview(URL.createObjectURL(f))
    runOcr(f) // 非阻塞
  }

  async function onPickBack(raw: File | null) {
    if (!raw) {
      setBackFile(null)
      setBackPreview(null)
      return
    }
    const f = await compressImage(raw)
    setBackFile(f)
    setBackPreview(URL.createObjectURL(f))
  }

  async function onPickBankcard(raw: File | null) {
    if (!raw) {
      setBankcardFile(null)
      setBankcardPreview(null)
      setBankOcr({ status: 'idle' })
      return
    }
    const f = await compressImage(raw)
    setBankcardFile(f)
    setBankcardPreview(URL.createObjectURL(f))
    runBankOcr(f) // 非阻塞
  }

  async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl)
    return res.blob()
  }

  async function uploadOne(
    recordId: number,
    kind: 'front' | 'back' | 'signature' | 'bankcard',
    blob: Blob,
    filename: string
  ) {
    const fd = new FormData()
    fd.append('kind', kind)
    fd.append('file', blob, filename)
    const res = await fetch(`/api/recycle/${recordId}/images`, { method: 'POST', body: fd })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `上传${kind}失败`)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!storeId) return toast.error('请选择门店')

    // 登记人
    if (!operatorSelect) return toast.error('请选择登记人')
    const operatorDisplayName =
      operatorSelect === OTHER_OPTION ? operatorOther.trim() : operatorSelect
    if (!operatorDisplayName) return toast.error('请填写登记人姓名')

    // 付款方式
    if (!paymentMethod) return toast.error('请选择付款方式')
    if (paymentMethod === 'other' && !paymentOtherDesc.trim()) {
      return toast.error('请填写付款方式说明')
    }
    const cardDigits = bankCardNumber.replace(/\D/g, '')
    if (paymentMethod === 'bank') {
      if (!bankName.trim()) return toast.error('请填写或识别银行名')
      if (!/^\d{12,19}$/.test(cardDigits)) {
        return toast.error('银行卡号应为 12-19 位数字')
      }
    }

    if (!customerName.trim()) return toast.error('请填写客户姓名')
    if (!/^(\d{17}[\dXx]|\d{15})$/.test(idNumber.trim())) {
      return toast.error('身份证号格式不正确')
    }
    if (!/^\d{11}$/.test(phone.trim())) return toast.error('手机号必须为 11 位数字')
    if (!frontFile) return toast.error('身份证正面必须上传')
    // 反面缺失：首次按"提交"只弹警告，不真的提交；第二次按才真提交
    if (!backFile && !backSkipConfirmed) {
      toast.warning('身份证反面未拍。再次点击提交可跳过（老板可在列表筛选"反面缺失"抽查）', {
        duration: 4000,
      })
      setBackSkipConfirmed(true)
      return
    }
    if (!consent) return toast.error('请勾选隐私同意')
    for (const it of items) {
      if (!it.material) return toast.error('请选择材料分类')
      const pn = Number(it.purity)
      if (!it.purity || !Number.isFinite(pn) || pn < 0 || pn > 100) {
        return toast.error('成色需填 0-100 之间的数字（光谱仪实测）')
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
        customerName: customerName.trim(),
        idNumber: idNumber.trim(),
        phone: phone.trim(),
        remarks: remarks.trim(),
        consentAccepted: true,
        operatorDisplayName,
        paymentMethod,
        paymentOtherDesc: paymentMethod === 'other' ? paymentOtherDesc.trim() : '',
        bankName: paymentMethod === 'bank' ? bankName.trim() : '',
        bankCardNumber: paymentMethod === 'bank' ? cardDigits : '',
        items: items.map((it) => ({
          material: it.material,
          purity: Number(it.purity).toFixed(2), // 2 位小数字符串
          weightG: Number(it.weightG),
          unitPrice: Number(it.unitPrice),
          amount: computeAmount(it.weightG, it.unitPrice),
        })),
      }
      const res = await fetch('/api/recycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '提交失败')
        return
      }
      const recordId = data.id as number

      // 上传照片 + 签名 + 银行卡原图（失败不阻止成功提示，但给出警告让店员补传）
      const uploads: Promise<void>[] = []
      if (frontFile) uploads.push(uploadOne(recordId, 'front', frontFile, frontFile.name || 'front.jpg'))
      if (backFile) uploads.push(uploadOne(recordId, 'back', backFile, backFile.name || 'back.jpg'))
      if (signature) {
        const sigBlob = await dataUrlToBlob(signature)
        uploads.push(uploadOne(recordId, 'signature', sigBlob, 'signature.png'))
      }
      if (paymentMethod === 'bank' && bankcardFile) {
        uploads.push(uploadOne(recordId, 'bankcard', bankcardFile, bankcardFile.name || 'bankcard.jpg'))
      }
      try {
        await Promise.all(uploads)
      } catch (err) {
        toast.warning(err instanceof Error ? err.message : '部分附件未上传成功，请在详情页补传')
      }

      toast.success(`已登记 ${data.recordNo}`)
      router.push(`/recycle/${recordId}/receipt`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 顶部简短告知 */}
      <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg px-4 py-3">
        <p className="text-xs text-amber-900 font-medium mb-0.5">📋 回购登记须知</p>
        <p className="text-xs text-amber-800/80">
          本次登记信息用于旧金回购合规存档，身份证信息加密保存，仅限内部查询使用。
        </p>
      </div>

      {/* 门店 + 日期 */}
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
              {stores.length === 0 && <option value="">（需先创建门店）</option>}
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

        {/* 登记人 */}
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

      {/* 物品明细（先谈价：客户接受价格后再登记身份） */}
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
                      aria-label="删除"
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
                      成色(%) <span className="text-gray-300">光谱仪实测</span>
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

      {/* 身份证正反面（客户接受价格后再拍照登记；OCR 自动回填下方姓名+身份证号） */}
      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-900">
          身份证照片 <span className="text-xs text-gray-400 font-normal">· 客户同意后再拍</span>
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <IdPhotoSlot
            label="正面"
            preview={frontPreview}
            inputRef={frontInputRef}
            onPick={onPickFront}
          />
          <IdPhotoSlot
            label="背面"
            preview={backPreview}
            inputRef={backInputRef}
            onPick={onPickBack}
          />
        </div>
        <p className="text-[11px] text-gray-400">照片将存入私有存储，预览通过短时签名 URL 查看</p>

        {/* OCR 状态条 */}
        {ocr.status === 'loading' && (
          <div className="inline-flex items-center gap-1 text-[11px] text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" /> 正在识别身份证…
          </div>
        )}
        {ocr.status === 'ok' && (ocr.fieldsFromOcr.name || ocr.fieldsFromOcr.idNumber) && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
            ✨ OCR 已自动填入
            {ocr.fieldsFromOcr.name && <span className="ml-1">姓名</span>}
            {ocr.fieldsFromOcr.name && ocr.fieldsFromOcr.idNumber && <span>、</span>}
            {ocr.fieldsFromOcr.idNumber && <span>身份证号</span>}
            <span className="ml-1 font-medium">· 请核对后再提交</span>
          </div>
        )}
        {ocr.status === 'ok' && !ocr.fieldsFromOcr.name && !ocr.fieldsFromOcr.idNumber && (
          <div className="text-[11px] text-gray-400">
            ✓ 识别成功，但姓名/身份证号已手填，未覆盖
          </div>
        )}
        {ocr.status === 'error' && (
          <div className="text-[11px] text-gray-500">⚠️ {ocr.message}</div>
        )}
      </section>

      {/* 客户信息 */}
      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-900">客户信息</h3>
        <div>
          <label className="block text-xs text-gray-500 mb-1">姓名 *</label>
          <input
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value)
              // 店员一旦手改，取消"OCR 回填"黄底标识
              if (ocr.status === 'ok' && ocr.fieldsFromOcr.name) {
                setOcr({ ...ocr, fieldsFromOcr: { ...ocr.fieldsFromOcr, name: false } })
              }
            }}
            className={`w-full h-9 text-sm rounded-md border px-2 ${
              ocr.status === 'ok' && ocr.fieldsFromOcr.name
                ? 'border-amber-300 bg-amber-50'
                : 'border-gray-300 bg-white'
            }`}
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">身份证号 *</label>
          <input
            value={idNumber}
            onChange={(e) => {
              setIdNumber(e.target.value.trim())
              if (ocr.status === 'ok' && ocr.fieldsFromOcr.idNumber) {
                setOcr({ ...ocr, fieldsFromOcr: { ...ocr.fieldsFromOcr, idNumber: false } })
              }
            }}
            inputMode="numeric"
            autoComplete="off"
            className={`w-full h-9 text-sm rounded-md border px-2 font-mono ${
              ocr.status === 'ok' && ocr.fieldsFromOcr.idNumber
                ? 'border-amber-300 bg-amber-50'
                : 'border-gray-300 bg-white'
            }`}
            placeholder="18 位身份证号 / 或拍正面照自动填入"
            required
          />
          <p className="mt-1 text-[11px] text-gray-400">该号码将加密保存，列表仅显示脱敏号</p>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">手机号 *</label>

          {/* 招 1：老客户手机号回填 */}
          {lookup.status === 'loading' && (
            <div className="mb-1.5 inline-flex items-center gap-1 text-[11px] text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" /> 查询历史记录…
            </div>
          )}
          {lookup.status === 'found' && !lookup.used && (
            <button
              type="button"
              onClick={applyLookupPhone}
              className="w-full mb-1.5 flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-left hover:bg-amber-100"
            >
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-900">
                <UserCheck className="w-3.5 h-3.5" />
                老客户 · 上次留
                <span className="font-mono">{lookup.phoneMasked}</span>
                <span className="text-amber-700/70">（{lookup.lastRecordDate}）</span>
              </span>
              <span className="text-[11px] text-amber-700 font-medium shrink-0">点击复用 →</span>
            </button>
          )}
          {lookup.status === 'found' && lookup.used && (
            <div className="mb-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-700">
              <Check className="w-3 h-3" /> 已复用上次手机号，如需修改请直接覆盖
            </div>
          )}

          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.trim())}
            inputMode="numeric"
            className="w-full h-9 text-sm rounded-md border border-gray-300 bg-white px-2 font-mono"
            maxLength={11}
            required
          />

          {/* 招 2：语音输入提示 */}
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-400">
            <Mic className="w-3 h-3" />
            可让客户口述 → 点手机键盘右上角🎤语音输入
          </p>
        </div>
      </section>

      {/* 付款方式 */}
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
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <CreditCard className="w-3.5 h-3.5" /> 银行卡信息
              </span>
              <span className="text-[11px] text-gray-400">拍照自动识别</span>
            </div>

            {/* 银行卡正面照（触发 OCR） */}
            <BankCardPhotoSlot
              preview={bankcardPreview}
              inputRef={bankcardInputRef}
              onPick={onPickBankcard}
            />

            {/* OCR 状态条 */}
            {bankOcr.status === 'loading' && (
              <div className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" /> 正在识别银行卡…
              </div>
            )}
            {bankOcr.status === 'ok' &&
              (bankOcr.filled.cardNumber || bankOcr.filled.bankName) && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
                  ✨ OCR 已自动填入
                  {bankOcr.filled.bankName && <span className="ml-1">银行</span>}
                  {bankOcr.filled.bankName && bankOcr.filled.cardNumber && <span>、</span>}
                  {bankOcr.filled.cardNumber && <span>卡号</span>}
                  <span className="ml-1 font-medium">· 请核对后再提交</span>
                </div>
              )}
            {bankOcr.status === 'error' && (
              <div className="text-[11px] text-gray-500">⚠️ {bankOcr.message}</div>
            )}

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
                value={formatCardNumber(bankCardNumber)}
                onChange={(e) => setBankCardNumber(e.target.value.replace(/\D/g, '').slice(0, 19))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="识别后自动填入，或手填"
                className="w-full h-9 text-sm rounded-md border border-gray-300 bg-white px-2 font-mono tracking-wider"
                required
              />
              <p className="mt-1 text-[11px] text-gray-400">
                卡号将加密保存，列表/小票仅显示后 4 位，老板可查明文
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 备注 */}
      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-xs text-gray-500 mb-1">备注</label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={2}
          className="w-full text-sm rounded-md border border-gray-300 bg-white px-2 py-1.5"
        />
      </section>

      {/* 签名 */}
      <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
        <h3 className="text-sm font-medium text-gray-900">客户签名</h3>
        <SignaturePad onChange={setSignature} />
      </section>

      {/* 温馨提示 */}
      <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-amber-900 mb-2">温馨提示</h3>
        <ol className="text-xs text-amber-900/90 leading-relaxed space-y-1 list-decimal list-inside">
          <li>
            根据国家相关政策法规要求，
            <span className="text-amber-700 font-medium">贵金属交易需进行实名登记</span>
            ，商户将依据《隐私政策》严格保护客户个人信息。
          </li>
          <li>未满 18 周岁需监护人陪同至线下门店办理，并携带监护人身份证件。</li>
          <li>身份证号仅加密存储用于合规备查，不会用于任何营销用途。</li>
          <li>
            如有疑问请联系门店工作人员，或拨打门店电话
            <a href="tel:15001761750" className="font-mono text-amber-700 underline">
              15001761750
            </a>
            。
          </li>
        </ol>
      </section>

      {/* 隐私同意 */}
      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            本人确认提供的身份证及联系信息真实有效，并同意商户出于《反洗钱法》《旧货流通管理办法》合规要求保存本次回购交易信息。
          </span>
        </label>
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
            <Check className="w-4 h-4" /> 提交登记
          </>
        )}
      </button>
    </form>
  )
}

function IdPhotoSlot({
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

function BankCardPhotoSlot({
  preview,
  inputRef,
  onPick,
}: {
  preview: string | null
  inputRef: React.RefObject<HTMLInputElement | null>
  onPick: (f: File | null) => void
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative aspect-[1.586/1] w-full rounded-md border-2 border-dashed border-gray-300 bg-white overflow-hidden flex items-center justify-center text-gray-400 hover:border-gray-400"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="银行卡" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-xs">
            <Camera className="w-5 h-5" />
            <span>拍卡正面 / 选择</span>
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
