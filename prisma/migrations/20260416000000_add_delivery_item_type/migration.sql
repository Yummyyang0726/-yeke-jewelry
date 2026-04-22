-- AlterTable: add itemType to DeliveryItem (4 types: 定制 / 进货 / 修理 / 旧料退回)
ALTER TABLE "DeliveryItem" ADD COLUMN "itemType" TEXT NOT NULL DEFAULT '定制';
