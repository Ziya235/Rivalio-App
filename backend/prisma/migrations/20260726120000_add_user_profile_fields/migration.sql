-- AlterTable
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "workplace" TEXT;
ALTER TABLE "User" ADD COLUMN "school" TEXT;

-- Backfill existing users (required columns)
UPDATE "User"
SET
  "username" = 'user_' || "id"::text,
  "dateOfBirth" = COALESCE("createdAt", NOW())
WHERE "username" IS NULL OR "dateOfBirth" IS NULL;

-- Make required columns NOT NULL
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "dateOfBirth" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
