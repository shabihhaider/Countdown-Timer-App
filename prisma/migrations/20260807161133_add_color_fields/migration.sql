-- AlterTable
ALTER TABLE "public"."Campaign" ADD COLUMN     "buttonBackgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN     "buttonTextColor" TEXT NOT NULL DEFAULT '#111111',
ADD COLUMN     "textColor" TEXT NOT NULL DEFAULT '#ffffff';
