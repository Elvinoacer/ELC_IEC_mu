import prisma from '../lib/prisma';

const voters = [
  { phone: "+254790670542", name: "Lead Voter" },
  // Add more voters here in the format: { phone: "+254...", name: "Name" }
];

async function main() {
  console.log("🌱 Starting voter registration seed...");

  let addedCount = 0;
  let skippedCount = 0;

  for (const voter of voters) {
    try {
      // Basic normalization: ensure it starts with +
      let normalizedPhone = voter.phone.trim();
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+254' + normalizedPhone.substring(1);
      } else if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = '+' + normalizedPhone;
      }

      await prisma.voter.upsert({
        where: { phone: normalizedPhone },
        update: { name: voter.name }, // Update name if already exists
        create: {
          phone: normalizedPhone,
          name: voter.name,
          hasVoted: false,
        },
      });
      
      console.log(`✅ Registered: ${normalizedPhone} (${voter.name || 'Anonymous'})`);
      addedCount++;
    } catch (error) {
      console.error(`❌ Failed to register ${voter.phone}:`, error);
      skippedCount++;
    }
  }

  console.log(`\n🏁 Voter seeding completed!`);
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
