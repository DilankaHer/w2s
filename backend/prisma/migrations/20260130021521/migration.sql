/*
  Warnings:

  - You are about to drop the column `isTemplate` on the `workouts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "workouts" DROP COLUMN "isTemplate",
ADD COLUMN     "isDefaultTemplate" BOOLEAN NOT NULL DEFAULT false;
