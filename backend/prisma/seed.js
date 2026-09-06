import { prisma } from "../config/db.js";
import { DEFAULT_SPORTS } from "../utils/sports.js";

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

  for (const sport of DEFAULT_SPORTS) {
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