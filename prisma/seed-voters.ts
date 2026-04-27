import prisma from "../lib/prisma";
import { RAW_VOTER_PHONES } from "./voter-phone-seed";

async function loadRawPhones(): Promise<readonly string[]> {
  try {
    // @ts-ignore - Local file is optional and ignored by git
    const localModule = await import("./voter-phone-seed.local");
    if (Array.isArray(localModule.RAW_VOTER_PHONES)) {
      return localModule.RAW_VOTER_PHONES as readonly string[];
    }
  } catch {
    // Local private seed file is optional.
  }
  return RAW_VOTER_PHONES;
}

async function main() {
  console.log("🌱 Starting incremental voter registration seed...");
  const rawPhones = await loadRawPhones();
  
  if (rawPhones.length === 0) {
    console.warn("⚠️ No voter phones found in prisma/voter-phone-seed.local.ts");
    return;
  }


  let addedCount = 0;
  let skippedCount = 0;

  for (const phone of rawPhones) {
    try {
      // Basic normalization: ensure it starts with +
      let normalizedPhone = phone.trim();
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+254' + normalizedPhone.substring(1);
      } else if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = '+' + normalizedPhone;
      }

      await prisma.voter.upsert({
        where: { phone: normalizedPhone },
        update: {}, // Don't overwrite if exists
        create: {
          phone: normalizedPhone,
          name: null,
          hasVoted: false,
        },
      });
      
      console.log(`✅ Registered: ${normalizedPhone}`);
      addedCount++;
    } catch (error) {
      console.error(`❌ Failed to register ${phone}:`, error);
      skippedCount++;
    }
  }

  console.log(`\n🏁 Incremental voter seeding completed!`);
  console.log(`📊 Summary: ${addedCount} registered, ${skippedCount} skipped.`);
}

main()
  .catch((e) => {
    console.error("❌ Critical Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
