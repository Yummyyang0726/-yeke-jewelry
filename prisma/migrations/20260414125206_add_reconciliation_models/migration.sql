-- CreateTable
CREATE TABLE "DeliveryNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "factoryId" INTEGER NOT NULL,
    "noteNumber" TEXT NOT NULL DEFAULT '',
    "noteDate" TEXT NOT NULL,
    "noteTime" TEXT NOT NULL DEFAULT '',
    "settlementMethod" TEXT NOT NULL DEFAULT '',
    "materialType" TEXT NOT NULL DEFAULT '',
    "goldPrice" REAL NOT NULL DEFAULT 0,
    "totalGoldWeight" REAL NOT NULL DEFAULT 0,
    "totalFee" REAL NOT NULL DEFAULT 0,
    "settledGoldWeight" REAL NOT NULL DEFAULT 0,
    "settledAmount" REAL NOT NULL DEFAULT 0,
    "prevOwedGold" REAL NOT NULL DEFAULT 0,
    "prevOwedMoney" REAL NOT NULL DEFAULT 0,
    "currentOwedGold" REAL NOT NULL DEFAULT 0,
    "currentOwedMoney" REAL NOT NULL DEFAULT 0,
    "imagePath" TEXT NOT NULL DEFAULT '',
    "receiptId" INTEGER,
    "paymentStatus" TEXT NOT NULL DEFAULT '未付',
    "paymentDate" TEXT,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "factoryPrevOwedGold" REAL,
    "factoryPrevOwedMoney" REAL,
    "factoryCurrentOwedGold" REAL,
    "factoryCurrentOwedMoney" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryNote_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryNote_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "RefineryReceipt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deliveryNoteId" INTEGER NOT NULL,
    "barcode" TEXT NOT NULL DEFAULT '',
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "goldWeight" REAL NOT NULL DEFAULT 0,
    "feePerGram" REAL NOT NULL DEFAULT 0,
    "feePerPiece" REAL NOT NULL DEFAULT 0,
    "lineTotal" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DeliveryItem_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RefineryReceipt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "factoryId" INTEGER,
    "receiptNumber" TEXT NOT NULL DEFAULT '',
    "receiptDate" TEXT NOT NULL,
    "refineryName" TEXT NOT NULL DEFAULT '',
    "totalIncoming" REAL NOT NULL DEFAULT 0,
    "totalPostMelt" REAL NOT NULL DEFAULT 0,
    "totalConverted" REAL NOT NULL DEFAULT 0,
    "shippedDate" TEXT,
    "shippedWeight" REAL NOT NULL DEFAULT 0,
    "trackingNumber" TEXT NOT NULL DEFAULT '',
    "imagePath" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefineryReceipt_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RefineryReceiptItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "receiptId" INTEGER NOT NULL,
    "materialName" TEXT NOT NULL DEFAULT '',
    "incomingWeight" REAL NOT NULL DEFAULT 0,
    "postMeltWeight" REAL NOT NULL DEFAULT 0,
    "conversionRate" REAL NOT NULL DEFAULT 1.0,
    "convertedWeight" REAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RefineryReceiptItem_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "RefineryReceipt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaterialReturn" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "factoryId" INTEGER NOT NULL,
    "returnDate" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "goldWeight" REAL NOT NULL,
    "recyclePrice" REAL NOT NULL DEFAULT 0,
    "amount" REAL NOT NULL DEFAULT 0,
    "trackingNumber" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '已寄出',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaterialReturn_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoldPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "goldPrice" REAL NOT NULL,
    "ptPrice" REAL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Factory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "initialOwedGold" REAL NOT NULL DEFAULT 0,
    "initialOwedMoney" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Factory" ("createdAt", "id", "name") SELECT "createdAt", "id", "name" FROM "Factory";
DROP TABLE "Factory";
ALTER TABLE "new_Factory" RENAME TO "Factory";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DeliveryNote_factoryId_noteDate_idx" ON "DeliveryNote"("factoryId", "noteDate" DESC);

-- CreateIndex
CREATE INDEX "DeliveryNote_noteDate_idx" ON "DeliveryNote"("noteDate" DESC);

-- CreateIndex
CREATE INDEX "RefineryReceipt_receiptDate_idx" ON "RefineryReceipt"("receiptDate" DESC);

-- CreateIndex
CREATE INDEX "MaterialReturn_factoryId_returnDate_idx" ON "MaterialReturn"("factoryId", "returnDate" DESC);
