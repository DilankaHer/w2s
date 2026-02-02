/*
  Warnings:

  - A unique constraint covering the columns `[setNumber,sessionExerciseId]` on the table `sessionsets` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "sessionexercises_sessionId_order_idx" ON "sessionexercises"("sessionId", "order");

-- CreateIndex
CREATE INDEX "sessions_userId_createdAt_idx" ON "sessions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "sessionsets_sessionExerciseId_idx" ON "sessionsets"("sessionExerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "sessionsets_setNumber_sessionExerciseId_key" ON "sessionsets"("setNumber", "sessionExerciseId");

-- CreateIndex
CREATE INDEX "sets_workoutExerciseId_idx" ON "sets"("workoutExerciseId");

-- CreateIndex
CREATE INDEX "workoutexercises_workoutId_order_idx" ON "workoutexercises"("workoutId", "order");

-- CreateIndex
CREATE INDEX "workouts_userId_createdAt_idx" ON "workouts"("userId", "createdAt");
