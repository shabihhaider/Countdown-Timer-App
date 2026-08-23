-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "targetCollectionIds" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "targetProductIds" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "targetTags" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "targetType" TEXT NOT NULL DEFAULT 'all';
