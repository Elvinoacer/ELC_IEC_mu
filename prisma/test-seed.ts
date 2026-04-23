import prisma from "../lib/prisma";

async function testSeed() {
  console.log("🧪 Seeding test data...");

  // 1. Create Voters
  const voters = [
    { phone: "+254700000001", name: "Voter One" },
    { phone: "+254700000002", name: "Voter Two" },
    { phone: "+254700000003", name: "Candidate One" },
    { phone: "+254700000004", name: "Candidate Two" },
  ];

  for (const v of voters) {
    await prisma.voter.upsert({
      where: { phone: v.phone },
      update: {},
      create: v
    });
  }
  console.log("✅ Created voters");

  // 2. Create Candidates (Approved)
  const candidates = [
    {
      name: "Alice Juma",
      phone: "+254700000003",
      school: "School of Engineering",
      yearOfStudy: "3rd Year",
      position: "Chairperson",
      scholarCode: "PF123",
      photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200",
      status: "APPROVED"
    },
    {
      name: "Bob Otieno",
      phone: "+254700000004",
      school: "School of Business",
      yearOfStudy: "4th Year",
      position: "Chairperson",
      scholarCode: "PF456",
      photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200",
      status: "APPROVED"
    }
  ];

  for (const c of candidates) {
    await prisma.candidate.upsert({
      where: { scholarCode: c.scholarCode },
      update: { status: "APPROVED" },
      create: c
    });
  }
  console.log("✅ Created candidates");

  // 3. Ensure Voting is OPEN
  await prisma.votingConfig.upsert({
    where: { id: 1 },
    update: {
      opensAt: new Date(Date.now() - 3600000), // 1h ago
      closesAt: new Date(Date.now() + 86400000), // 24h from now
      isManuallyClosed: false
    },
    create: {
      id: 1,
      opensAt: new Date(Date.now() - 3600000),
      closesAt: new Date(Date.now() + 86400000),
      isManuallyClosed: false
    }
  });
  console.log("✅ Voting window opened (ID: 1)");

  console.log("🏁 Test seeding completed!");
}

testSeed();
