'use client'

import Link from 'next/link'
import { Printer, ChevronLeft } from 'lucide-react'

type Props = {
  record: {
    recordNo: string
    recordDate: string
    customerName: string
    idNumberMasked: string
    phone: string
    remarks: string | null
    totalAmount: number
    totalWeight: number
    operatorName: string
    createdAt: string
  }
  store: {
    name: string
    shortName: string
    phone: string
    address: string
  } | null
  items: {
    id: number
    material: string
    purity: string
    weightG: number
    unitPrice: number
    amount: number
  }[]
}

/** "足金 99.20%"，兼容旧记录（material 为空 / purity 为 "足金999"） */
function formatMaterialPurity(material: string, purity: string): string {
  const pn = Number(purity)
  const pStr = purity && Number.isFinite(pn) ? `${pn.toFixed(2)}%` : purity
  if (!material) return pStr || '—'
  return pStr ? `${material} ${pStr}` : material
}

export function ReceiptPrinter({ record, store, items }: Props) {
  // 打开时不自动打印：有的店员还需要核对、电子签名才结算。
  // 显式按钮 "立即打印" 让店员决定时机。

  return (
    <div className="receipt-wrap">
      <div className="no-print flex items-center justify-between mb-4 print:hidden">
        <Link href="/recycle/new" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-4 h-4" /> 再录一条
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1 rounded-md bg-gray-900 text-white text-sm px-3 py-1.5 hover:bg-gray-700"
        >
          <Printer className="w-4 h-4" /> 立即打印
        </button>
      </div>

      <div className="receipt bg-white border border-gray-200 rounded-lg p-6 print:border-0 print:rounded-none print:p-0">
        <div className="text-center">
          <h1 className="text-lg font-bold tracking-wide">旧金回购登记单 · 客户联</h1>
          {store && (
            <div className="mt-1 text-xs text-gray-500">
              {store.name}
              {store.phone ? ` · ${store.phone}` : ''}
              {store.address ? ` · ${store.address}` : ''}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-between text-sm">
          <span>
            编号 <span className="font-mono">{record.recordNo}</span>
          </span>
          <span>日期 {record.recordDate}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <div>
            <span className="text-gray-500">姓名：</span>
            {record.customerName}
          </div>
          <div>
            <span className="text-gray-500">手机：</span>
            <span className="font-mono">{record.phone}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">身份证：</span>
            <span className="font-mono">{record.idNumberMasked}</span>
          </div>
        </div>

        <table className="mt-4 w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left font-normal py-1.5">成色</th>
              <th className="text-right font-normal py-1.5">重量(g)</th>
              <th className="text-right font-normal py-1.5">单价</th>
              <th className="text-right font-normal py-1.5">金额</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-gray-100">
                <td className="py-1.5">{formatMaterialPurity(it.material, it.purity)}</td>
                <td className="py-1.5 text-right font-mono">{it.weightG.toFixed(2)}</td>
                <td className="py-1.5 text-right font-mono">{it.unitPrice.toFixed(2)}</td>
                <td className="py-1.5 text-right font-mono">{it.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-400">
              <td className="py-1.5 font-medium">合计</td>
              <td className="py-1.5 text-right font-mono font-medium">{record.totalWeight.toFixed(2)}</td>
              <td></td>
              <td className="py-1.5 text-right font-mono font-medium">¥{record.totalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {record.remarks && (
          <div className="mt-4 text-sm">
            <span className="text-gray-500">备注：</span>
            {record.remarks}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-gray-500 mb-8">客户签名</div>
            <div className="border-b border-gray-400 h-8"></div>
          </div>
          <div>
            <div className="text-gray-500 mb-8">经办人：{record.operatorName}</div>
            <div className="border-b border-gray-400 h-8"></div>
          </div>
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-gray-500">
          本单依据《反洗钱法》《旧货流通管理办法》等法规，对旧金回购交易进行实名登记。
          客户身份证号码经加密存储，仅限监管核查时由法定权限人员查阅。
          客户联请妥善保管，如对交易有异议请于 24 小时内凭本单到店处理。
        </p>
      </div>

      <style>{`
        @media print {
          @page { size: A5; margin: 8mm; }
          body { background: white !important; }
          .no-print, header, footer, nav { display: none !important; }
          .receipt { box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </div>
  )
}
