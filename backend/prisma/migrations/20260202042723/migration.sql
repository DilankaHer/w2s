/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,exerciseId]` on the table `sessionexercises` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "sessionexercises_sessionId_exerciseId_key" ON "sessionexercises"("sessionId", "exerciseId");
