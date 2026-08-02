-- CreateTable
CREATE TABLE "public"."Campaign" (
    "id"               SERIAL NOT NULL,
    "shop"             TEXT NOT NULL,
    "name"             TEXT NOT NULL DEFAULT 'My Sale',
    "isActive"         BOOLEAN NOT NULL DEFAULT true,
    "barMessage"       TEXT NOT NULL DEFAULT 'Flash Sale Ends In...',
    "buttonText"       TEXT NOT NULL DEFAULT 'Shop Now',
    "buttonUrl"        TEXT NOT NULL DEFAULT '/collections/all',
    "startDate"        TIMESTAMP(3),
    "endDate"          TIMESTAMP(3),
    "timezone"         TEXT NOT NULL DEFAULT 'UTC',
    "backgroundColor"  TEXT NOT NULL DEFAULT '#288d40',
    "position"         TEXT NOT NULL DEFAULT 'top',
    "endAction"        TEXT NOT NULL DEFAULT 'hide',
    "customEndMessage" TEXT NOT NULL DEFAULT '',
    "pageTargeting"    TEXT NOT NULL DEFAULT '[]',
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignAnalytics" (
    "id"          SERIAL NOT NULL,
    "campaignId"  INTEGER NOT NULL,
    "date"        DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks"      INTEGER NOT NULL DEFAULT 0,
    "closes"      INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OnboardingState" (
    "id"             SERIAL NOT NULL,
    "shop"           TEXT NOT NULL,
    "step1Complete"  BOOLEAN NOT NULL DEFAULT false,
    "step2Complete"  BOOLEAN NOT NULL DEFAULT false,
    "step3Complete"  BOOLEAN NOT NULL DEFAULT false,
    "completedAt"    TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_shop_idx" ON "public"."Campaign"("shop");

-- CreateIndex
CREATE INDEX "Campaign_shop_isActive_idx" ON "public"."Campaign"("shop", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignAnalytics_campaignId_date_key" ON "public"."CampaignAnalytics"("campaignId", "date");

-- CreateIndex
CREATE INDEX "CampaignAnalytics_campaignId_idx" ON "public"."CampaignAnalytics"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingState_shop_key" ON "public"."OnboardingState"("shop");

-- AddForeignKey
ALTER TABLE "public"."CampaignAnalytics"
    ADD CONSTRAINT "CampaignAnalytics_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
