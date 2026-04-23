import prisma from "../lib/prisma";
import { hashAdminPassword } from "../lib/auth/admin-password";

async function main() {
  console.log("🌱 Starting database seed...");

  // 1. Create Default Super Admin
  const adminPassword = await hashAdminPassword("Freedom2023");
  const admin = await prisma.admin.upsert({
    where: { username: "elvin" },
    update: {},
    create: {
      username: "elvin",
      passwordHash: adminPassword,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`✅ Admin created: ${admin.username} (Role: ${admin.role})`);

  // 2. Create Default Voting Config (Opens in 1 hour, closes in 24 hours)
  const now = new Date();
  const config = await prisma.votingConfig.create({
    data: {
      opensAt: new Date(now.getTime() + 60 * 60 * 1000), // 1 hr from now
      closesAt: new Date(now.getTime() + 25 * 60 * 60 * 1000), // 25 hrs from now
      candidateRegOpensAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Yesterday
      candidateRegClosesAt: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 2 days from now
      isManuallyClosed: false,
      updatedById: admin.id,
    },
  });
  console.log(`✅ Default Voting Config created (ID: ${config.id})`);

  // 3. Create Basic Positions
  const positions = [
    "Chairperson",
    "Vice Chairperson",
    "Secretary General",
    "Treasurer",
    "Organizing Secretary",
  ];

  for (let i = 0; i < positions.length; i++) {
    await prisma.position.upsert({
      where: { title: positions[i] },
      update: { displayOrder: i },
      create: {
        title: positions[i],
        displayOrder: i,
      },
    });
  }
  console.log(`✅ Added ${positions.length} default positions.`);

  console.log("🏁 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
