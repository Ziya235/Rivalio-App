-- CreateEnum
CREATE TYPE "ChampionshipVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CHAMPIONSHIP_JOIN_REQUEST';

-- AlterTable
ALTER TABLE "Championship" ADD COLUMN "visibility" "ChampionshipVisibility" NOT NULL DEFAULT 'PRIVATE';

-- CreateTable
CREATE TABLE "ChampionshipJoinRequest" (
    "id" SERIAL NOT NULL,
    "championshipId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionshipJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChampionshipJoinRequest_championshipId_status_idx" ON "ChampionshipJoinRequest"("championshipId", "status");

-- CreateIndex
CREATE INDEX "ChampionshipJoinRequest_teamId_status_idx" ON "ChampionshipJoinRequest"("teamId", "status");

-- AddForeignKey
ALTER TABLE "ChampionshipJoinRequest" ADD CONSTRAINT "ChampionshipJoinRequest_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChampionshipJoinRequest" ADD CONSTRAINT "ChampionshipJoinRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChampionshipJoinRequest" ADD CONSTRAINT "ChampionshipJoinRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
