-- AlterEnum
ALTER TYPE "ChampionshipStatus" ADD VALUE 'FINISHED';

-- AlterTable
ALTER TABLE "League" ADD COLUMN "matchFormat" "ChampionshipMatchFormat" NOT NULL DEFAULT 'SINGLE';
