import prisma from "../lib/prisma";
import { hashAdminPassword } from "../lib/auth/admin-password";
import { normalizePhone } from "../lib/phone";
import { RAW_VOTER_PHONES } from "./voter-phone-seed";

type ParsedPhones = {
  phones: string[];
  invalidCount: number;
  duplicateCount: number;
  sourceCount: number;
};

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

function parseVoterPhones(rawPhones: readonly string[]): ParsedPhones {
  const lines = rawPhones
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const seen = new Set<string>();
  const phones: string[] = [];
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const line of lines) {
    const normalized = normalizePhone(line);
    if (!normalized) {
      invalidCount++;
      continue;
    }

    if (seen.has(normalized)) {
      duplicateCount++;
      continue;
    }

    seen.add(normalized);
    phones.push(normalized);
  }

  return {
    phones,
    invalidCount,
    duplicateCount,
    sourceCount: lines.length,
  };
}

async function clearCoreData(): Promise<void> {
  // Run deletes sequentially to reduce risk of transaction start timeouts on remote DBs.
  await prisma.vote.deleteMany();
  await prisma.voteAttempt.deleteMany();
  await prisma.otpRequest.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.voter.deleteMany();
  await prisma.votingConfig.deleteMany();
  await prisma.position.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.smsLog.deleteMany();
  await prisma.admin.deleteMany();
}

async function main() {
  console.log("🌱 Starting database seed...");

  await clearCoreData();
  console.log("🧹 Cleared existing core election data.");

  const rawPhones = await loadRawPhones();
  const parsedPhones = parseVoterPhones(rawPhones);
  console.log(
    `📱 Parsed phone list: ${parsedPhones.sourceCount} rows, ${parsedPhones.phones.length} valid unique, ${parsedPhones.duplicateCount} duplicates, ${parsedPhones.invalidCount} invalid.`,
  );
  if (parsedPhones.sourceCount === 0) {
    console.warn(
      "⚠️ No voter phones loaded. Add numbers to prisma/voter-phone-seed.local.ts (ignored by git).",
    );
  }

  // 1. Create Default Super Admin
  const adminPassword = await hashAdminPassword("Freedom2023");
  const admin = await prisma.admin.create({
    data: {
      username: "elvin",
      passwordHash: adminPassword,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`✅ Admin created: ${admin.username} (Role: ${admin.role})`);

  // 2. Seed Voters from the loaded phone list (prioritizes local untracked file)
  const voterRows = parsedPhones.phones.map((phone) => ({
    phone,
    name: null,
    hasVoted: false,
    addedById: admin.id,
  }));

  const votersResult = await prisma.voter.createMany({
    data: voterRows,
    skipDuplicates: true,
  });
  console.log(`✅ Seeded voters: ${votersResult.count}`);

  // 3. Create Default Voting Config (Opens in 1 hour, closes in 24 hours)
  const now = new Date();
  const config = await prisma.votingConfig.create({
    data: {
      opensAt: new Date(now.getTime() + 60 * 60 * 1000),
      closesAt: new Date(now.getTime() + 25 * 60 * 60 * 1000),
      candidateRegOpensAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      candidateRegClosesAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      isManuallyClosed: false,
      updatedById: admin.id,
    },
  });
  console.log(`✅ Default Voting Config created (ID: ${config.id})`);

  // 4. Create Basic Positions
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

  console.log(
    `📊 Final summary: ${votersResult.count} voters seeded, ${parsedPhones.duplicateCount} duplicate rows skipped, ${parsedPhones.invalidCount} invalid rows ignored.`,
  );

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
