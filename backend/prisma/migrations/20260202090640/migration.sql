/*
  Warnings:

  - You are about to drop the column `isCompleted` on the `sessionsets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "isSyncedOnce" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sessionsets" DROP COLUMN "isCompleted";
