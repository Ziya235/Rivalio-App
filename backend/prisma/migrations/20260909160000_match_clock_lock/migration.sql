-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "reopenedAt" TIMESTAMP(3),
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "editUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Match_status_editUntil_idx" ON "Match"("status", "editUntil");
