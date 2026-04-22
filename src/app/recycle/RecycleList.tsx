'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Search, Download, FileArchive, AlertTriangle } from 'lucide-react'

type Row = {
  id: number
  recordNo: string
  recordDate: string
  storeShortName: string
  storeName: string
  customerName: string
  idNumberMasked: string
  phone: string
  totalAmount: number
  totalWeight: number
  operatorName: string
  status: string
  hasFront: boolean
  hasBack: boolean
}

export function RecycleList({
  initial,
  stores,
}: {
  initial: Row[]
  stores: { id: number; name: string; shortName: string }[]
}) {
  const [rows, setRows] = useState<Row[]>(initial)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [storeId, setStoreId] = useState('')
  const [q, setQ] = useState('')
  const [missingBack, setMissingBack] = useState(false)
  const [pending, startTransition] = useTransition()

  function buildQuery(extra?: Record<string, string>): string {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (storeId) params.set('storeId', storeId)
    if (q.trim()) params.set('q', q.trim())
    if (missingBack) params.set('missingBack', '1')
    if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, v)
    return params.toString()
  }

  function runSearch() {
    startTransition(async () => {
      const qs = buildQuery()
      const res = await fetch('/api/recycle' + (qs ? `?${qs}` : ''))
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? '查询失败')
        return
      }
      setRows(data.records ?? [])
    })
  }

  function handleExport() {
    const qs = buildQuery()
    window.location.href = '/api/recycle/export' + (qs ? `?${qs}` : '')
  }

  function handleArchive() {
    // 默认打开上个月归档；用户在归档页内可切换月份和门店
    const params = new URLSearchParams()
    if (storeId) params.set('storeId', storeId)
    const qs = params.toString()
    window.open('/recycle/archive' + (qs ? `?${qs}` : ''), '_blank')
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 text-sm rounded-md border border-gray-300 bg-white px-2"
          placeholder="起"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 text-sm rounded-md border border-gray-300 bg-white px-2"
          placeholder="止"
        />
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 mb-3">
        <select
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          className="h-9 text-sm rounded-md border border-gray-300 bg-white px-2"
        >
          <option value="">全部门店</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 text-sm hover:bg-gray-50"
        >
          <Download className="w-4 h-4" /> CSV
        </button>
        <button
          onClick={handleArchive}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 text-sm hover:bg-gray-50"
          title="生成可打印的月度归档 PDF"
        >
          <FileArchive className="w-4 h-4" /> 月度归档
        </button>
      </div>
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="姓名/手机/编号/ID 后 4 位"
            className="h-9 w-full text-sm rounded-md border border-gray-300 bg-white pl-8 pr-2"
          />
        </div>
        <button
          onClick={runSearch}
          disabled={pending}
          className="rounded-md bg-gray-900 text-white text-sm px-4 hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? '…' : '搜索'}
        </button>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={missingBack}
          onChange={(e) => {
            setMissingBack(e.target.checked)
            // 勾选即触发一次搜索，无需再按按钮
            setTimeout(runSearch, 0)
          }}
          className="w-3.5 h-3.5"
        />
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        仅显示反面缺失
      </label>

      {rows.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-10">暂无记录</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/recycle/${r.id}`}
                className="block rounded-md border border-gray-200 bg-white px-3 py-2.5 hover:border-gray-300"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-sm text-gray-900 inline-flex items-center gap-1.5">
                    {r.customerName}
                    {!r.hasBack && (
                      <span
                        title="身份证反面未拍"
                        className="inline-flex items-center gap-0.5 rounded px-1 py-px text-[10px] font-normal bg-amber-100 text-amber-800 border border-amber-200"
                      >
                        <AlertTriangle className="w-2.5 h-2.5" />
                        缺反面
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">{r.recordNo}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {r.recordDate} · {r.storeShortName} · {r.operatorName}
                  </span>
                  <span className="font-medium text-gray-700">¥{r.totalAmount.toFixed(2)}</span>
                </div>
                <div className="mt-0.5 text-xs text-gray-400 font-mono">
                  {r.idNumberMasked} · {r.phone} · {r.totalWeight.toFixed(2)}g
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
