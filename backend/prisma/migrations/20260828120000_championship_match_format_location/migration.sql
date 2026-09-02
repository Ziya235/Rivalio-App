-- CreateEnum
CREATE TYPE "ChampionshipMatchFormat" AS ENUM ('SINGLE', 'HOME_AWAY');

-- AlterTable
ALTER TABLE "Championship" ADD COLUMN "matchFormat" "ChampionshipMatchFormat" NOT NULL DEFAULT 'SINGLE';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "location" TEXT;
