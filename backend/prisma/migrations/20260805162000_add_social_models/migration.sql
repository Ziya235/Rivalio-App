-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('OPEN', 'ACCEPTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PlayerSearchStatus" AS ENUM ('OPEN', 'FULL', 'CANCELLED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_leagueId_fkey";

-- DropIndex
DROP INDEX "Team_leagueId_name_key";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "createdById" INTEGER,
ADD COLUMN     "statsApplied" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "leagueId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "leagueId",
ADD COLUMN     "captainId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "LeagueTeam" (
    "id" SERIAL NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamPlayerInvite" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "invitedUserId" INTEGER NOT NULL,
    "invitedById" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "position" TEXT,
    "shirtNumber" INTEGER,
    "message" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamPlayerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueTeamInvite" (
    "id" SERIAL NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "invitedById" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueTeamInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueJoinRequest" (
    "id" SERIAL NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "notes" TEXT,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'OPEN',
    "acceptedTeamId" INTEGER,
    "matchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeRequest" (
    "id" SERIAL NOT NULL,
    "challengeId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSearch" (
    "id" SERIAL NOT NULL,
    "hostTeamId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "opponentTeamId" INTEGER,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "notes" TEXT,
    "playersNeeded" INTEGER NOT NULL,
    "playersFilled" INTEGER NOT NULL DEFAULT 0,
    "status" "PlayerSearchStatus" NOT NULL DEFAULT 'OPEN',
    "matchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSearchRequest" (
    "id" SERIAL NOT NULL,
    "playerSearchId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerSearchRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeagueTeam_teamId_idx" ON "LeagueTeam"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueTeam_leagueId_teamId_key" ON "LeagueTeam"("leagueId", "teamId");

-- CreateIndex
CREATE INDEX "TeamPlayerInvite_invitedUserId_status_idx" ON "TeamPlayerInvite"("invitedUserId", "status");

-- CreateIndex
CREATE INDEX "TeamPlayerInvite_invitedById_status_idx" ON "TeamPlayerInvite"("invitedById", "status");

-- CreateIndex
CREATE INDEX "TeamPlayerInvite_teamId_status_idx" ON "TeamPlayerInvite"("teamId", "status");

-- CreateIndex
CREATE INDEX "LeagueTeamInvite_teamId_status_idx" ON "LeagueTeamInvite"("teamId", "status");

-- CreateIndex
CREATE INDEX "LeagueTeamInvite_leagueId_status_idx" ON "LeagueTeamInvite"("leagueId", "status");

-- CreateIndex
CREATE INDEX "LeagueJoinRequest_leagueId_status_idx" ON "LeagueJoinRequest"("leagueId", "status");

-- CreateIndex
CREATE INDEX "LeagueJoinRequest_teamId_status_idx" ON "LeagueJoinRequest"("teamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_matchId_key" ON "Challenge"("matchId");

-- CreateIndex
CREATE INDEX "Challenge_status_scheduledAt_idx" ON "Challenge"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Challenge_teamId_status_idx" ON "Challenge"("teamId", "status");

-- CreateIndex
CREATE INDEX "ChallengeRequest_challengeId_status_idx" ON "ChallengeRequest"("challengeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeRequest_challengeId_teamId_key" ON "ChallengeRequest"("challengeId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSearch_matchId_key" ON "PlayerSearch"("matchId");

-- CreateIndex
CREATE INDEX "PlayerSearch_status_scheduledAt_idx" ON "PlayerSearch"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "PlayerSearch_hostTeamId_status_idx" ON "PlayerSearch"("hostTeamId", "status");

-- CreateIndex
CREATE INDEX "PlayerSearchRequest_playerSearchId_status_idx" ON "PlayerSearchRequest"("playerSearchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSearchRequest_playerSearchId_userId_key" ON "PlayerSearchRequest"("playerSearchId", "userId");

-- CreateIndex
CREATE INDEX "Match_scheduledAt_status_idx" ON "Match"("scheduledAt", "status");

-- CreateIndex
CREATE INDEX "Match_matchType_status_idx" ON "Match"("matchType", "status");

-- CreateIndex
CREATE INDEX "MatchEvent_playerId_idx" ON "MatchEvent"("playerId");

-- CreateIndex
CREATE INDEX "MatchEvent_assistPlayerId_idx" ON "MatchEvent"("assistPlayerId");

-- CreateIndex
CREATE INDEX "Player_userId_idx" ON "Player"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_teamId_userId_key" ON "Player"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueTeam" ADD CONSTRAINT "LeagueTeam_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueTeam" ADD CONSTRAINT "LeagueTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPlayerInvite" ADD CONSTRAINT "TeamPlayerInvite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPlayerInvite" ADD CONSTRAINT "TeamPlayerInvite_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPlayerInvite" ADD CONSTRAINT "TeamPlayerInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueTeamInvite" ADD CONSTRAINT "LeagueTeamInvite_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueTeamInvite" ADD CONSTRAINT "LeagueTeamInvite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueTeamInvite" ADD CONSTRAINT "LeagueTeamInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueJoinRequest" ADD CONSTRAINT "LeagueJoinRequest_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueJoinRequest" ADD CONSTRAINT "LeagueJoinRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueJoinRequest" ADD CONSTRAINT "LeagueJoinRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_acceptedTeamId_fkey" FOREIGN KEY ("acceptedTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeRequest" ADD CONSTRAINT "ChallengeRequest_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeRequest" ADD CONSTRAINT "ChallengeRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeRequest" ADD CONSTRAINT "ChallengeRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSearch" ADD CONSTRAINT "PlayerSearch_hostTeamId_fkey" FOREIGN KEY ("hostTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSearch" ADD CONSTRAINT "PlayerSearch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSearch" ADD CONSTRAINT "PlayerSearch_opponentTeamId_fkey" FOREIGN KEY ("opponentTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSearch" ADD CONSTRAINT "PlayerSearch_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSearchRequest" ADD CONSTRAINT "PlayerSearchRequest_playerSearchId_fkey" FOREIGN KEY ("playerSearchId") REFERENCES "PlayerSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSearchRequest" ADD CONSTRAINT "PlayerSearchRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
