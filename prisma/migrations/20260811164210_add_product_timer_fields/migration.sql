-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "accentColor" TEXT NOT NULL DEFAULT '#dc2626',
ADD COLUMN     "labelText" TEXT NOT NULL DEFAULT 'Sale ends in',
ADD COLUMN     "productStyle" TEXT NOT NULL DEFAULT 'minimal';
