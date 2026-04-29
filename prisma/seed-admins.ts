import prisma from "../lib/prisma";
import { hashAdminPassword } from "../lib/auth/admin-password";

async function main() {
  console.log("🌱 Seeding additional admins...");

  const adminsToSeed = [
    { username: "silas", role: "IEC", password: "Admin@2026" },
    { username: "maureen", role: "IEC", password: "Admin@2026" },
  ];

  for (const adminData of adminsToSeed) {
    const hashedPassword = await hashAdminPassword(adminData.password);
    
    await prisma.admin.upsert({
      where: { username: adminData.username },
      update: {
        passwordHash: hashedPassword,
        role: adminData.role,
      },
      create: {
        username: adminData.username,
        passwordHash: hashedPassword,
        role: adminData.role,
      },
    });
    
    console.log(`✅ Admin ${adminData.username} ready.`);
  }

  console.log("🏁 Admin seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
