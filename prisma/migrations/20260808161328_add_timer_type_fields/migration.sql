-- AlterTable
ALTER TABLE "public"."Campaign" ADD COLUMN     "dailyResetTime" TEXT NOT NULL DEFAULT '00:00',
ADD COLUMN     "evergreenMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "timerType" TEXT NOT NULL DEFAULT 'one_time';
