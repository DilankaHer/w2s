-- AlterTable
ALTER TABLE "sessionexercises" ADD COLUMN     "restTime" INTEGER NOT NULL DEFAULT 120000;

-- AlterTable
ALTER TABLE "sessionsets" ADD COLUMN     "setType" TEXT;

-- AlterTable
ALTER TABLE "sets" ADD COLUMN     "setType" TEXT;

-- AlterTable
ALTER TABLE "workoutexercises" ADD COLUMN     "restTime" INTEGER NOT NULL DEFAULT 120000;
