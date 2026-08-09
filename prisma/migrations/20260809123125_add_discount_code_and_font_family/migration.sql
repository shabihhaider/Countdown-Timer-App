-- AlterTable
ALTER TABLE "public"."Campaign" ADD COLUMN     "discountCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "fontFamily" TEXT NOT NULL DEFAULT 'system';
