import Database from 'better-sqlite3'
import path from 'node:path'

/**
 * 回购业务独立数据库（与主库 dev.db 物理分离）
 *
 * 设计取舍：
 *  - 不走 Prisma：该模块只有 4 张表、都是简单 CRUD，不值得维护第二套 prisma schema 和 migration 目录
 *  - 表结构用 CREATE TABLE IF NOT EXISTS 在连接时自动建好；新加列用 ALTER TABLE 手动升级（目前还没到升级阶段）
 *  - 存放位置由 RECYCLE_DB_PATH 环境变量指定，默认 ./prisma/recycle.db
 *
 * 使用：
 *   import { db } from '@/lib/recycle-db'
 *   db.prepare('SELECT * FROM RecycleRecord WHERE id = ?').get(id)
 */

const DB_PATH = process.env.RECYCLE_DB_PATH || path.join(process.cwd(), 'prisma', 'recycle.db')

declare global {
  // eslint-disable-next-line no-var
  var __recycleDb: Database.Database | undefined
}

function open(): Database.Database {
  const conn = new Database(DB_PATH)
  conn.pragma('journal_mode = WAL')
  conn.pragma('foreign_keys = ON')
  initSchema(conn)
  return conn
}

export const db: Database.Database = global.__recycleDb || open()
if (process.env.NODE_ENV !== 'production') global.__recycleDb = db

function initSchema(conn: Database.Database) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS RecycleStore (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      shortName  TEXT NOT NULL,
      address    TEXT NOT NULL DEFAULT '',
      phone      TEXT NOT NULL DEFAULT '',
      createdAt  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS RecycleRecord (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      recordNo           TEXT NOT NULL UNIQUE,
      recordDate         TEXT NOT NULL,
      storeId            INTEGER NOT NULL,

      customerName       TEXT NOT NULL,
      idNumberEncrypted  TEXT NOT NULL,
      idNumberLast4      TEXT NOT NULL,
      phone              TEXT NOT NULL,
      address            TEXT NOT NULL DEFAULT '',
      isMinor            INTEGER NOT NULL DEFAULT 0,
      signaturePath      TEXT,
      idFrontPath        TEXT,
      idBackPath         TEXT,
      consentAccepted    INTEGER NOT NULL DEFAULT 0,
      consentAt          TEXT,

      remarks            TEXT,
      totalAmount        REAL NOT NULL DEFAULT 0,
      totalWeight        REAL NOT NULL DEFAULT 0,

      status             TEXT NOT NULL DEFAULT 'completed',
      operatorUserId     INTEGER,
      operatorName       TEXT NOT NULL DEFAULT '',
      operatorDisplayName TEXT NOT NULL DEFAULT '',

      paymentMethod      TEXT NOT NULL DEFAULT '',
      paymentOtherDesc   TEXT NOT NULL DEFAULT '',
      bankName           TEXT NOT NULL DEFAULT '',
      bankCardLast4      TEXT NOT NULL DEFAULT '',
      bankCardEncrypted  TEXT NOT NULL DEFAULT '',
      bankCardPath       TEXT,

      createdAt          TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt          TEXT NOT NULL DEFAULT (datetime('now')),

      FOREIGN KEY (storeId) REFERENCES RecycleStore(id)
    );

    CREATE INDEX IF NOT EXISTS idx_record_store_date ON RecycleRecord(storeId, recordDate DESC);
    CREATE INDEX IF NOT EXISTS idx_record_date ON RecycleRecord(recordDate DESC);
    CREATE INDEX IF NOT EXISTS idx_record_last4 ON RecycleRecord(idNumberLast4);
    CREATE INDEX IF NOT EXISTS idx_record_phone ON RecycleRecord(phone);

    CREATE TABLE IF NOT EXISTS RecycleItem (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      recordId   INTEGER NOT NULL,
      purity     TEXT NOT NULL,
      weightG    REAL NOT NULL,
      unitPrice  REAL NOT NULL,
      amount     REAL NOT NULL,
      sortOrder  INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (recordId) REFERENCES RecycleRecord(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_item_record ON RecycleItem(recordId);

    CREATE TABLE IF NOT EXISTS RecycleSequence (
      storeId  INTEGER NOT NULL,
      year     INTEGER NOT NULL,
      lastSeq  INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (storeId, year),
      FOREIGN KEY (storeId) REFERENCES RecycleStore(id)
    );
  `)

  // 增量升级：用 try/catch 吞"duplicate column"错误，兼容 next build 期
  // 多 worker 并发打开同一个 DB 时的竞争（PRAGMA 检查后 ALTER 之间的窗口）
  const tryAdd = (table: string, name: string, decl: string) => {
    try {
      conn.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${decl}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!/duplicate column name/i.test(msg)) throw e
    }
  }

  // RecycleItem: material（材料分类，与光谱仪实测成色配对）
  tryAdd('RecycleItem', 'material', `TEXT NOT NULL DEFAULT ''`)

  // RecycleRecord: 登记人显示名、付款方式、银行卡信息
  // - operatorDisplayName: 下拉选中的登记人姓名（与 operatorName = session 登录名并存）
  // - paymentMethod: 'bank' | 'alipay' | 'wechat' | 'other'
  // - paymentOtherDesc: paymentMethod='other' 时的说明
  // - bankName / bankCardLast4: 明文，店员老板都可见
  // - bankCardEncrypted: AES-256-GCM 加密的完整卡号，仅老板可解密（B 方案）
  // - bankCardPath: 银行卡原图 COS 私有 key（可选）
  tryAdd('RecycleRecord', 'operatorDisplayName', `TEXT NOT NULL DEFAULT ''`)
  tryAdd('RecycleRecord', 'paymentMethod', `TEXT NOT NULL DEFAULT ''`)
  tryAdd('RecycleRecord', 'paymentOtherDesc', `TEXT NOT NULL DEFAULT ''`)
  tryAdd('RecycleRecord', 'bankName', `TEXT NOT NULL DEFAULT ''`)
  tryAdd('RecycleRecord', 'bankCardLast4', `TEXT NOT NULL DEFAULT ''`)
  tryAdd('RecycleRecord', 'bankCardEncrypted', `TEXT NOT NULL DEFAULT ''`)
  tryAdd('RecycleRecord', 'bankCardPath', `TEXT`)
}

// ===== 类型 =====

export type RecycleStoreRow = {
  id: number
  name: string
  shortName: string
  address: string
  phone: string
  createdAt: string
}

export type RecycleRecordRow = {
  id: number
  recordNo: string
  recordDate: string
  storeId: number
  customerName: string
  idNumberEncrypted: string
  idNumberLast4: string
  phone: string
  address: string
  isMinor: number // 0/1
  signaturePath: string | null
  idFrontPath: string | null
  idBackPath: string | null
  consentAccepted: number
  consentAt: string | null
  remarks: string | null
  totalAmount: number
  totalWeight: number
  status: string
  operatorUserId: number | null
  operatorName: string
  operatorDisplayName: string
  paymentMethod: string // '' | 'bank' | 'alipay' | 'wechat' | 'other'
  paymentOtherDesc: string
  bankName: string
  bankCardLast4: string
  bankCardEncrypted: string
  bankCardPath: string | null
  createdAt: string
  updatedAt: string
}

export type RecycleItemRow = {
  id: number
  recordId: number
  material: string // 足金/K金/铂金/银/其他（旧记录可能为空字符串）
  purity: string // 光谱仪实测成色百分比字符串，如 '99.20'；旧记录可能是 '足金999' 这种
  weightG: number
  unitPrice: number
  amount: number
  sortOrder: number
}

// ===== 编号生成 =====

/**
 * 事务内生成下一条编号：YK-{shortName}-{YY}-{NNNN}
 * 调用方须已在 db.transaction(...) 里调用。
 */
export function nextRecordNo(storeId: number, storeShortName: string, year: number): string {
  const sel = db.prepare('SELECT lastSeq FROM RecycleSequence WHERE storeId = ? AND year = ?')
  const row = sel.get(storeId, year) as { lastSeq: number } | undefined
  let next: number
  if (!row) {
    db.prepare('INSERT INTO RecycleSequence (storeId, year, lastSeq) VALUES (?, ?, 1)').run(storeId, year)
    next = 1
  } else {
    next = row.lastSeq + 1
    db.prepare('UPDATE RecycleSequence SET lastSeq = ? WHERE storeId = ? AND year = ?').run(next, storeId, year)
  }
  const yy = String(year).padStart(2, '0')
  const seq = String(next).padStart(4, '0')
  return `YK-${storeShortName}-${yy}-${seq}`
}

// ===== 便捷查询 =====

export function getStore(id: number): RecycleStoreRow | undefined {
  return db.prepare('SELECT * FROM RecycleStore WHERE id = ?').get(id) as RecycleStoreRow | undefined
}

export function listStores(): RecycleStoreRow[] {
  return db.prepare('SELECT * FROM RecycleStore ORDER BY id ASC').all() as RecycleStoreRow[]
}

export function getRecord(id: number): RecycleRecordRow | undefined {
  return db.prepare('SELECT * FROM RecycleRecord WHERE id = ?').get(id) as RecycleRecordRow | undefined
}

export function listItemsForRecord(recordId: number): RecycleItemRow[] {
  return db
    .prepare('SELECT * FROM RecycleItem WHERE recordId = ? ORDER BY sortOrder ASC, id ASC')
    .all(recordId) as RecycleItemRow[]
}
