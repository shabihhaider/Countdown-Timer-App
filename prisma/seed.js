import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function seed() {
  console.log("Seeding database...\n");

  const DEMO_SHOP = "demo-store.myshopify.com";

  // Clean existing seed data
  await db.campaignAnalytics.deleteMany({ where: { campaign: { shop: DEMO_SHOP } } });
  await db.campaign.deleteMany({ where: { shop: DEMO_SHOP } });
  await db.onboardingState.deleteMany({ where: { shop: DEMO_SHOP } });
  await db.setting.deleteMany({ where: { shop: DEMO_SHOP } });

  // 1. Active campaign with future end date
  const activeCampaign = await db.campaign.create({
    data: {
      shop: DEMO_SHOP,
      name: "Summer Flash Sale",
      isActive: true,
      barMessage: "Summer Sale — 40% OFF Everything!",
      buttonText: "Shop Now",
      buttonUrl: "/collections/sale",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      timezone: "UTC",
      backgroundColor: "#e63946",
      position: "top",
      endAction: "show_custom",
      customEndMessage: "Sale has ended. Stay tuned for our next event!",
    },
  });
  console.log("  Created: Active campaign — Summer Flash Sale");

  // 2. Expired campaign
  await db.campaign.create({
    data: {
      shop: DEMO_SHOP,
      name: "Spring Clearance",
      isActive: false,
      barMessage: "Spring Clearance — Up to 60% OFF",
      buttonText: "View Deals",
      buttonUrl: "/collections/clearance",
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // ended 7 days ago
      timezone: "UTC",
      backgroundColor: "#2a9d8f",
      position: "top",
      endAction: "hide",
      customEndMessage: "",
    },
  });
  console.log("  Created: Expired campaign — Spring Clearance");

  // 3. Scheduled future campaign
  await db.campaign.create({
    data: {
      shop: DEMO_SHOP,
      name: "Black Friday 2026",
      isActive: false,
      barMessage: "Black Friday Starts NOW — 50% OFF Sitewide!",
      buttonText: "Shop Black Friday",
      buttonUrl: "/collections/black-friday",
      startDate: new Date("2026-11-27T00:00:00Z"),
      endDate: new Date("2026-11-30T23:59:59Z"),
      timezone: "America/New_York",
      backgroundColor: "#1d1d1d",
      position: "top",
      endAction: "show_ended",
      customEndMessage: "",
    },
  });
  console.log("  Created: Scheduled campaign — Black Friday 2026");

  // 4. Analytics data for active campaign (last 7 days)
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    date.setUTCHours(0, 0, 0, 0);

    const impressions = Math.floor(Math.random() * 500) + 100;
    const clicks = Math.floor(impressions * (Math.random() * 0.08 + 0.02));
    const closes = Math.floor(impressions * (Math.random() * 0.05 + 0.01));

    await db.campaignAnalytics.create({
      data: {
        campaignId: activeCampaign.id,
        date,
        impressions,
        clicks,
        closes,
      },
    });
  }
  console.log("  Created: 7 days of analytics data");

  // 5. Completed onboarding state
  await db.onboardingState.create({
    data: {
      shop: DEMO_SHOP,
      step1Complete: true,
      step2Complete: true,
      step3Complete: true,
      completedAt: new Date(),
    },
  });
  console.log("  Created: Onboarding state (completed)");

  // 6. Legacy Setting record (backward compatibility testing)
  await db.setting.create({
    data: {
      shop: DEMO_SHOP,
      value: JSON.stringify({
        barMessage: "Legacy Sale Timer",
        buttonText: "Shop",
        buttonLink: "/collections/all",
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        barColor: "#288d40",
        barPosition: "top",
        endAction: "hide",
      }),
    },
  });
  console.log("  Created: Legacy Setting record\n");

  console.log("Seed complete! Demo shop: " + DEMO_SHOP);
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
