-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'bar';

-- CreateIndex
CREATE INDEX "Campaign_shop_type_isActive_idx" ON "Campaign"("shop", "type", "isActive");
