-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CHAMPIONSHIP_INVITE';

-- CreateTable
CREATE TABLE "ChampionshipTeamInvite" (
    "id" SERIAL NOT NULL,
    "championshipId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "invitedById" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionshipTeamInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChampionshipTeamInvite_teamId_status_idx" ON "ChampionshipTeamInvite"("teamId", "status");

-- CreateIndex
CREATE INDEX "ChampionshipTeamInvite_championshipId_status_idx" ON "ChampionshipTeamInvite"("championshipId", "status");

-- AddForeignKey
ALTER TABLE "ChampionshipTeamInvite" ADD CONSTRAINT "ChampionshipTeamInvite_championshipId_fkey" FOREIGN KEY ("championshipId") REFERENCES "Championship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipTeamInvite" ADD CONSTRAINT "ChampionshipTeamInvite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampionshipTeamInvite" ADD CONSTRAINT "ChampionshipTeamInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
