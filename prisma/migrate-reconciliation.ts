/**
 * 旧对账系统数据迁移脚本
 * 从 yeke-reconciliation (Flask/SQLite) 导入数据到新系统 (Prisma/SQLite)
 *
 * 用法: npx tsx prisma/migrate-reconciliation.ts
 */

import Database from 'better-sqlite3'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const OLD_DB_PATH = '/Users/yangmingyang_1/Desktop/YummyAI/yeke-reconciliation/data/yeke.db'

const dbUrl = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'dev.db')}`
const adapter = new PrismaBetterSqlite3({ url: dbUrl })
const prisma = new PrismaClient({ adapter })

async function main() {
  const oldDb = new Database(OLD_DB_PATH, { readonly: true })

  console.log('=== 开始迁移旧对账系统数据 ===\n')

  // 1. Get existing factories from new system
  const existingFactories = await prisma.factory.findMany()
  const factoryNameMap = new Map(existingFactories.map((f) => [f.name, f.id]))

  // 2. Import factories (merge by name)
  const oldFactories = oldDb.prepare('SELECT * FROM factory').all() as Array<{
    id: number; name: string; contact_person: string; phone: string; notes: string;
    initial_owed_gold: number; initial_owed_money: number
  }>

  const oldToNewFactoryId = new Map<number, number>()

  for (const of_ of oldFactories) {
    if (factoryNameMap.has(of_.name)) {
      const newId = factoryNameMap.get(of_.name)!
      await prisma.factory.update({
        where: { id: newId },
        data: {
          contactPerson: of_.contact_person || '',
          phone: of_.phone || '',
          notes: of_.notes || '',
          initialOwedGold: of_.initial_owed_gold || 0,
          initialOwedMoney: of_.initial_owed_money || 0,
        },
      })
      oldToNewFactoryId.set(of_.id, newId)
      console.log(`  工厂已合并: ${of_.name} (old:${of_.id} → new:${newId})`)
    } else {
      const newFactory = await prisma.factory.create({
        data: {
          name: of_.name,
          contactPerson: of_.contact_person || '',
          phone: of_.phone || '',
          notes: of_.notes || '',
          initialOwedGold: of_.initial_owed_gold || 0,
          initialOwedMoney: of_.initial_owed_money || 0,
        },
      })
      oldToNewFactoryId.set(of_.id, newFactory.id)
      factoryNameMap.set(of_.name, newFactory.id)
      console.log(`  工厂已创建: ${of_.name} (old:${of_.id} → new:${newFactory.id})`)
    }
  }
  console.log(`\n工厂: ${oldFactories.length} 个处理完成\n`)

  // 3. Import refinery receipts first (delivery notes reference them)
  const oldReceipts = oldDb.prepare('SELECT * FROM refinery_receipt ORDER BY id').all() as Array<{
    id: number; factory_id: number | null; receipt_number: string; receipt_date: string;
    refinery_name: string; total_incoming: number; total_post_melt: number;
    total_converted: number; shipped_date: string | null; shipped_weight: number;
    tracking_number: string; image_path: string; notes: string
  }>

  const oldToNewReceiptId = new Map<number, number>()

  for (const or_ of oldReceipts) {
    const newFactoryId = or_.factory_id ? oldToNewFactoryId.get(or_.factory_id) ?? null : null
    const receipt = await prisma.refineryReceipt.create({
      data: {
        factoryId: newFactoryId,
        receiptNumber: or_.receipt_number || '',
        receiptDate: or_.receipt_date || '',
        refineryName: or_.refinery_name || '',
        totalIncoming: or_.total_incoming || 0,
        totalPostMelt: or_.total_post_melt || 0,
        totalConverted: or_.total_converted || 0,
        shippedDate: or_.shipped_date || null,
        shippedWeight: or_.shipped_weight || 0,
        trackingNumber: or_.tracking_number || '',
        imagePath: or_.image_path || '',
        notes: or_.notes || '',
      },
    })
    oldToNewReceiptId.set(or_.id, receipt.id)
  }
  console.log(`收料单: ${oldReceipts.length} 个已导入`)

  // Import receipt items
  const oldReceiptItems = oldDb.prepare('SELECT * FROM refinery_receipt_item ORDER BY id').all() as Array<{
    id: number; receipt_id: number; material_name: string; incoming_weight: number;
    post_melt_weight: number; conversion_rate: number; converted_weight: number; sort_order: number
  }>

  for (const item of oldReceiptItems) {
    const newReceiptId = oldToNewReceiptId.get(item.receipt_id)
    if (!newReceiptId) continue
    await prisma.refineryReceiptItem.create({
      data: {
        receiptId: newReceiptId,
        materialName: item.material_name || '',
        incomingWeight: item.incoming_weight || 0,
        postMeltWeight: item.post_melt_weight || 0,
        conversionRate: item.conversion_rate || 1.0,
        convertedWeight: item.converted_weight || 0,
        sortOrder: item.sort_order || 0,
      },
    })
  }
  console.log(`收料单明细: ${oldReceiptItems.length} 个已导入`)

  // 4. Import delivery notes
  const oldNotes = oldDb.prepare('SELECT * FROM delivery_note ORDER BY id').all() as Array<{
    id: number; factory_id: number; note_number: string; note_date: string;
    settlement_method: string; material_type: string; gold_price: number;
    total_gold_weight: number; total_fee: number; settled_gold_weight: number;
    settled_amount: number; prev_owed_gold: number; prev_owed_money: number;
    current_owed_gold: number; current_owed_money: number; image_path: string;
    receipt_id: number | null; payment_status: string; payment_date: string | null;
    notes: string
  }>

  const oldToNewNoteId = new Map<number, number>()

  for (const on_ of oldNotes) {
    const newFactoryId = oldToNewFactoryId.get(on_.factory_id)
    if (!newFactoryId) {
      console.warn(`  跳过出库单 ${on_.id}: 工厂 ${on_.factory_id} 未映射`)
      continue
    }

    const newReceiptId = on_.receipt_id ? oldToNewReceiptId.get(on_.receipt_id) ?? null : null

    const note = await prisma.deliveryNote.create({
      data: {
        factoryId: newFactoryId,
        noteNumber: on_.note_number || '',
        noteDate: on_.note_date || '',
        settlementMethod: on_.settlement_method || '',
        materialType: on_.material_type || '',
        goldPrice: on_.gold_price || 0,
        totalGoldWeight: on_.total_gold_weight || 0,
        totalFee: on_.total_fee || 0,
        settledGoldWeight: on_.settled_gold_weight || 0,
        settledAmount: on_.settled_amount || 0,
        prevOwedGold: on_.prev_owed_gold || 0,
        prevOwedMoney: on_.prev_owed_money || 0,
        currentOwedGold: on_.current_owed_gold || 0,
        currentOwedMoney: on_.current_owed_money || 0,
        imagePath: on_.image_path || '',
        receiptId: newReceiptId,
        paymentStatus: on_.payment_status || '未付',
        paymentDate: on_.payment_date || null,
        notes: on_.notes || '',
      },
    })
    oldToNewNoteId.set(on_.id, note.id)
  }
  console.log(`出库单: ${oldNotes.length} 个已导入`)

  // Import delivery items
  const oldItems = oldDb.prepare('SELECT * FROM delivery_item ORDER BY id').all() as Array<{
    id: number; delivery_note_id: number; barcode: string; product_name: string;
    quantity: number; gold_weight: number; fee_per_gram: number; fee_per_piece: number;
    line_total: number; sort_order: number
  }>

  for (const item of oldItems) {
    const newNoteId = oldToNewNoteId.get(item.delivery_note_id)
    if (!newNoteId) continue
    await prisma.deliveryItem.create({
      data: {
        deliveryNoteId: newNoteId,
        barcode: item.barcode || '',
        productName: item.product_name || '',
        quantity: item.quantity || 1,
        goldWeight: item.gold_weight || 0,
        feePerGram: item.fee_per_gram || 0,
        feePerPiece: item.fee_per_piece || 0,
        lineTotal: item.line_total || 0,
        sortOrder: item.sort_order || 0,
      },
    })
  }
  console.log(`出库单明细: ${oldItems.length} 个已导入`)

  // 5. Import material returns
  let returnCount = 0
  try {
    const oldReturns = oldDb.prepare('SELECT * FROM material_return ORDER BY id').all() as Array<{
      id: number; factory_id: number; return_date: string; material_name: string;
      gold_weight: number; recycle_price: number; amount: number;
      tracking_number: string; status: string; notes: string
    }>

    for (const mr of oldReturns) {
      const newFactoryId = oldToNewFactoryId.get(mr.factory_id)
      if (!newFactoryId) continue
      await prisma.materialReturn.create({
        data: {
          factoryId: newFactoryId,
          returnDate: mr.return_date || '',
          materialName: mr.material_name || '',
          goldWeight: mr.gold_weight || 0,
          recyclePrice: mr.recycle_price || 0,
          amount: mr.amount || 0,
          trackingNumber: mr.tracking_number || '',
          status: mr.status || '已寄出',
          notes: mr.notes || '',
        },
      })
      returnCount++
    }
  } catch {
    console.log('旧料寄回表不存在或为空，跳过')
  }
  console.log(`旧料寄回: ${returnCount} 个已导入`)

  console.log('\n=== 迁移完成 ===')

  oldDb.close()
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('迁移出错:', e)
  process.exit(1)
})
