'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Printer, ChevronLeft } from 'lucide-react'

type Item = {
  id: number
  purity: string
  weightG: number
  unitPrice: number
  amount: number
}

type Row = {
  id: number
  recordNo: string
  recordDate: string
  storeShortName: string
  storeName: string
  customerName: string
  idNumberMasked: string
  phone: string
  totalWeight: number
  totalAmount: number
  operatorName: string
  items: Item[]
}

type Props = {
  year: number
  month: number
  storeId: number | null
  storeLabel: string
  stores: { id: number; name: string; shortName: string }[]
  rows: Row[]
  totalWeight: number
  totalAmount: number
  generatedAt: string
  generatedBy: string
}

export function ArchivePrinter({
  year,
  month,
  storeId,
  storeLabel,
  stores,
  rows,
  totalWeight,
  totalAmount,
  generatedAt,
  generatedBy,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigate(changes: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    router.push(`/recycle/archive?${next.toString()}`)
  }

  // 年月候选：近 24 个月
  const monthOptions: { year: number; month: number; label: string }[] = []
  const today = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    monthOptions.push({ year: y, month: m, label: `${y}年${String(m).padStart(2, '0')}月` })
  }

  return (
    <div className="archive-wrap">
      <div className="no-print flex items-center justify-between gap-2 mb-4 print:hidden">
        <Link href="/recycle" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-4 h-4" /> 返回列表
        </Link>
        <div className="flex items-center gap-2">
          <select
            value={`${year}-${month}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-')
              navigate({ year: y, month: m })
            }}
            className="h-9 text-sm rounded-md border border-gray-300 bg-white px-2"
          >
            {monthOptions.map((o) => (
              <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={storeId ?? ''}
            onChange={(e) => navigate({ storeId: e.target.value })}
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
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 rounded-md bg-gray-900 text-white text-sm px-3 py-1.5 hover:bg-gray-700"
          >
            <Printer className="w-4 h-4" /> 打印 / 存为 PDF
          </button>
        </div>
      </div>

      <div className="archive bg-white border border-gray-200 rounded-lg p-8 print:border-0 print:rounded-none print:p-0">
        {/* 封面标题区 */}
        <div className="text-center border-b-2 border-gray-900 pb-4">
          <h1 className="text-xl font-bold tracking-wider">旧金回购登记 · 月度归档</h1>
          <div className="mt-2 text-base">
            {year} 年 {String(month).padStart(2, '0')} 月 · {storeLabel}
          </div>
        </div>

        {/* 汇总卡片 */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="border border-gray-300 rounded p-3">
            <div className="text-xs text-gray-500">记录数</div>
            <div className="mt-1 text-xl font-medium font-mono">{rows.length}</div>
          </div>
          <div className="border border-gray-300 rounded p-3">
            <div className="text-xs text-gray-500">总重量 (g)</div>
            <div className="mt-1 text-xl font-medium font-mono">{totalWeight.toFixed(2)}</div>
          </div>
          <div className="border border-gray-300 rounded p-3">
            <div className="text-xs text-gray-500">总金额 (元)</div>
            <div className="mt-1 text-xl font-medium font-mono">¥{totalAmount.toFixed(2)}</div>
          </div>
        </div>

        {/* 明细表 */}
        <h2 className="mt-8 text-sm font-medium text-gray-900 border-b border-gray-300 pb-1">明细</h2>
        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">本月暂无记录</div>
        ) : (
          <table className="mt-3 w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="text-left font-medium py-1.5 px-1">编号</th>
                <th className="text-left font-medium py-1.5 px-1">日期</th>
                <th className="text-left font-medium py-1.5 px-1">门店</th>
                <th className="text-left font-medium py-1.5 px-1">客户</th>
                <th className="text-left font-medium py-1.5 px-1">身份证(脱敏)</th>
                <th className="text-left font-medium py-1.5 px-1">手机</th>
                <th className="text-right font-medium py-1.5 px-1">重量(g)</th>
                <th className="text-right font-medium py-1.5 px-1">金额</th>
                <th className="text-left font-medium py-1.5 px-1">经办人</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-200 align-top">
                  <td className="py-1.5 px-1 font-mono">{r.recordNo}</td>
                  <td className="py-1.5 px-1">{r.recordDate}</td>
                  <td className="py-1.5 px-1">{r.storeShortName}</td>
                  <td className="py-1.5 px-1">{r.customerName}</td>
                  <td className="py-1.5 px-1 font-mono">{r.idNumberMasked}</td>
                  <td className="py-1.5 px-1 font-mono">{r.phone}</td>
                  <td className="py-1.5 px-1 text-right font-mono">{r.totalWeight.toFixed(2)}</td>
                  <td className="py-1.5 px-1 text-right font-mono">¥{r.totalAmount.toFixed(2)}</td>
                  <td className="py-1.5 px-1">{r.operatorName}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-900 font-medium">
                <td colSpan={6} className="py-1.5 px-1 text-right">
                  合计
                </td>
                <td className="py-1.5 px-1 text-right font-mono">{totalWeight.toFixed(2)}</td>
                <td className="py-1.5 px-1 text-right font-mono">¥{totalAmount.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}

        {/* 页脚 */}
        <div className="mt-8 pt-3 border-t border-gray-300 text-[11px] text-gray-500 leading-relaxed">
          <p>
            本归档依据《反洗钱法》《旧货流通管理办法》对旧金回购交易进行实名登记存档。
            身份证号仅在系统内以 AES-256-GCM 加密存储；本页面为长期保存所做的脱敏快照，
            不含明文身份证号和附件照片。如监管机关需核验原始附件或明文证件号，请由法定权限人员在系统内调取。
          </p>
          <p className="mt-2">
            导出时间：{generatedAt} · 导出人：{generatedBy}
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; }
          .no-print, header, footer, nav { display: none !important; }
          .archive { box-shadow: none !important; border: none !important; }
          table { font-size: 10px; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}
