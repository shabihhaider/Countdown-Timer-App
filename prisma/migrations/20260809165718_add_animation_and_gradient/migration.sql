-- AlterTable
ALTER TABLE "public"."Campaign" ADD COLUMN     "animationStyle" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "backgroundStyle" TEXT NOT NULL DEFAULT '';
