/**
 * One-time migration script: converts legacy Setting records into Campaign records.
 *
 * Run manually after deploying the data model unification:
 *   node prisma/migrate-settings-to-campaigns.js
 *
 * Safe to run multiple times — skips shops that already have a Campaign.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function migrate() {
  console.log("Migrating Setting records to Campaign records...\n");

  const settings = await db.setting.findMany();
  console.log(`  Found ${settings.length} Setting record(s)`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const setting of settings) {
    // Skip shops that already have a Campaign (already migrated or new install)
    const existingCampaign = await db.campaign.findFirst({
      where: { shop: setting.shop },
    });

    if (existingCampaign) {
      console.log(`  SKIP: ${setting.shop} — already has ${existingCampaign.name}`);
      skipped++;
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(setting.value);
    } catch {
      console.error(`  FAIL: ${setting.shop} — invalid JSON in Setting.value`);
      failed++;
      continue;
    }

    // Parse end date — Setting stores it as an ISO string or datetime-local string
    let endDate = null;
    if (parsed.endDate) {
      const d = new Date(parsed.endDate);
      if (!isNaN(d.getTime())) {
        endDate = d;
      }
    }

    // Map Setting field names → Campaign column names
    const campaignData = {
      shop: setting.shop,
      name: "Migrated Campaign",
      isActive: endDate ? endDate > new Date() : false,
      barMessage: parsed.barMessage || "Flash Sale Ends In...",
      buttonText: parsed.buttonText || "Shop Now",
      buttonUrl: parsed.buttonLink || parsed.buttonUrl || "/collections/all",
      endDate,
      backgroundColor: parsed.barColor || "#288d40",
      position: Array.isArray(parsed.barPosition)
        ? parsed.barPosition[0]
        : parsed.barPosition || "top",
      endAction: parsed.endAction || "hide",
      customEndMessage: parsed.customEndMessage || "",
    };

    try {
      await db.campaign.create({ data: campaignData });
      console.log(`  OK:   ${setting.shop} → Campaign created`);
      migrated++;
    } catch (err) {
      console.error(`  FAIL: ${setting.shop} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Failed:   ${failed}`);

  if (failed === 0 && migrated > 0) {
    console.log(`\nAll records migrated successfully.`);
    console.log(`You can now safely remove the Setting model from schema.prisma`);
    console.log(`and drop the "Setting" table via a new migration.`);
  }
}

migrate()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
