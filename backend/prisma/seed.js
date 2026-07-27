import { prisma } from "../config/db.js";

const permissions = [
  {
    code: "football_view",
    description: "Can view football data",
  },
  {
    code: "football_create",
    description: "Can create football data",
  },
  {
    code: "football_update",
    description: "Can update football data",
  },
];

const sports = [
  {
    name: "Football",
    code: "FOOTBALL",
    isEnabled: true,
  },
  {
    name: "Basketball",
    code: "BASKETBALL",
    isEnabled: false,
  },
  {
    name: "Tennis",
    code: "TENNIS",
    isEnabled: false,
  },
  {
    name: "Volleyball",
    code: "VOLLEYBALL",
    isEnabled: false,
  },
  {
    name: "Padel",
    code: "PADEL",
    isEnabled: false,
  },
];

async function main() {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        code: permission.code,
      },
      update: {},
      create: permission,
    });
  }

  for (const sport of sports) {
    await prisma.sport.upsert({
      where: {
        code: sport.code,
      },
      update: {
        name: sport.name,
        isEnabled: sport.isEnabled,
      },
      create: sport,
    });
  }

  console.log("Seed completed successfully");
}

main()
  .catch((error) => {
    console.log(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });