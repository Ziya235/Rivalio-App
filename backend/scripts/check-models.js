import { prisma } from "../config/db.js";

const names = [
  "challenge",
  "playerSearch",
  "leagueTeam",
  "leagueTeamInvite",
  "leagueJoinRequest",
];

for (const name of names) {
  console.log(name, typeof prisma[name]);
}

await prisma.$disconnect();
