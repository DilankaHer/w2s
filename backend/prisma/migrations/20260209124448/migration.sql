/*
  Warnings:

  - A unique constraint covering the columns `[userId,name]` on the table `workouts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "workouts_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "workouts_userId_name_key" ON "workouts"("userId", "name");
