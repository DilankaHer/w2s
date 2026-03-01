/*
  Warnings:

  - You are about to drop the column `isSynced` on the `bodyparts` table. All the data in the column will be lost.
  - You are about to drop the column `isSynced` on the `equipment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bodyparts" DROP COLUMN "isSynced";

-- AlterTable
ALTER TABLE "equipment" DROP COLUMN "isSynced";

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "updatedWorkoutAt" DROP NOT NULL;
