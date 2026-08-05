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

CREATE INDEX "TeamPlayerInvite_invitedUserId_status_idx"
ON "TeamPlayerInvite"("invitedUserId", "status");

CREATE INDEX "TeamPlayerInvite_invitedById_status_idx"
ON "TeamPlayerInvite"("invitedById", "status");

CREATE INDEX "TeamPlayerInvite_teamId_status_idx"
ON "TeamPlayerInvite"("teamId", "status");

ALTER TABLE "TeamPlayerInvite"
ADD CONSTRAINT "TeamPlayerInvite_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "Team"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamPlayerInvite"
ADD CONSTRAINT "TeamPlayerInvite_invitedUserId_fkey"
FOREIGN KEY ("invitedUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamPlayerInvite"
ADD CONSTRAINT "TeamPlayerInvite_invitedById_fkey"
FOREIGN KEY ("invitedById") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
