-- CreateEnum
CREATE TYPE "MatchStage" AS ENUM ('GROUP_STAGE', 'PRELIMINARY', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL');

-- CreateEnum
CREATE TYPE "ChampionshipStatus" AS ENUM ('DRAFT', 'REGISTRATION', 'GROUP_STAGE', 'PLAYOFF', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChampionshipFormat" AS ENUM ('GROUP_AND_PLAYOFF', 'PLAYOFF_ONLY');

-- AlterEnum
ALTER TYPE "MatchType" ADD VALUE 'CHAMPIONSHIP';

-- CreateTable
CREATE TABLE "Championship" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "format" "ChampionshipFormat" NOT NULL DEFAULT 'GROUP_AND_PLAYOFF',
    "status" "ChampionshipStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "maxTeams" INTEGER,
    "defaultQualifyCount" INTEGER NOT NULL DEFAULT 2,
    "sportId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Championship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampionshipTeam" (
    "id" SERIAL NOT NULL,
    "championshipId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChampionshipTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampionshipGroup" (
    "id" SERIAL NOT NULL,
    "championshipId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "teamSlots" INTEGER,
    "qualifyCount" INTEGER NOT NULL DEFAULT 2,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionshipGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampionshipGroupTeam" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "seed" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChampionshipGroupTeam_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "championshipId" INTEGER,
ADD COLUMN "groupId" INTEGER,
ADD COLUMN "winnerTeamId" INTEGER,
ADD COLUMN "stage" "MatchStage";

-- CreateIndex
CREATE INDEX "Championship_sportId_status_idx" ON "Championship"("sportId", "status");

-- CreateIndex
CREATE INDEX "Championship_createdById_idx" ON "Championship"("createdById");

-- CreateIndex
CREATE INDEX "ChampionshipTeam_teamId_idx" ON "ChampionshipTeam"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionshipTeam_championshipId_teamId_key" ON "ChampionshipTeam"("championshipId", "teamId");

-- CreateIndex
CREATE INDEX "ChampionshipGroup_championshipId_sortOrder_idx" ON "ChampionshipGroup"("championshipId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionshipGroup_championshipId_name_key" ON "ChampionshipGroup"("championshipId", "name");

-- CreateIndex
CREATE INDEX "ChampionshipGroupTeam_teamId_idx" ON "ChampionshipGroupTeam"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ChampionshipGroupTeam_groupId_teamId_key" ON "ChampionshipGroupTeam"("groupId", "teamId");

-- CreateIndex
CREATE INDEX "Match_championshipId_status_idx" ON "Match"("championshipId", "status");

-- CreateIndex
CREATE INDEX "Match_championshipId_stage_idx" ON "Match"("championshipId", "stage");

-- CreateIndex
CREATE INDEX "Match_groupId_status_idx" ON "Match"("groupId", "status");

-- AddForeignKey
ALTER TABLE "Championship" ADD CONSTRAINT "Championship_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Championship" ADD CONSTRAINT "Championship_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipTeam" ADD CONSTRAINT "ChampionshipTeam_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipTeam" ADD CONSTRAINT "ChampionshipTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipGroup" ADD CONSTRAINT "ChampionshipGroup_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipGroupTeam" ADD CONSTRAINT "ChampionshipGroupTeam_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChampionshipGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipGroupTeam" ADD CONSTRAINT "ChampionshipGroupTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ChampionshipGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
