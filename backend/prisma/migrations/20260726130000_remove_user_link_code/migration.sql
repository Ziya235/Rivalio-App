-- DropIndex
DROP INDEX IF EXISTS "User_linkCode_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "linkCode";
