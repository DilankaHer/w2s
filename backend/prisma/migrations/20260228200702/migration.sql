/*
  Warnings:

  - The primary key for the `bodyparts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `equipment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `exercises` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `sessionexercises` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `isFromDefaultTemplate` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `isSyncedOnce` on the `sessions` table. All the data in the column will be lost.
  - The primary key for the `sessionsets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `sets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `email` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `users` table. All the data in the column will be lost.
  - The primary key for the `workoutexercises` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `workouts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `isDefaultTemplate` on the `workouts` table. All the data in the column will be lost.
  - Added the required column `exerciseCount` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `setCount` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedWorkoutAt` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Made the column `reps` on table `sessionsets` required. This step will fail if there are existing NULL values in that column.
  - Made the column `weight` on table `sessionsets` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `exerciseCount` to the `workouts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `setCount` to the `workouts` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "exercises" DROP CONSTRAINT "exercises_bodyPartId_fkey";

-- DropForeignKey
ALTER TABLE "exercises" DROP CONSTRAINT "exercises_equipmentId_fkey";

-- DropForeignKey
ALTER TABLE "sessionexercises" DROP CONSTRAINT "sessionexercises_exerciseId_fkey";

-- DropForeignKey
ALTER TABLE "sessionexercises" DROP CONSTRAINT "sessionexercises_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "sessionsets" DROP CONSTRAINT "sessionsets_sessionExerciseId_fkey";

-- DropForeignKey
ALTER TABLE "sets" DROP CONSTRAINT "sets_workoutExerciseId_fkey";

-- DropForeignKey
ALTER TABLE "workoutexercises" DROP CONSTRAINT "workoutexercises_exerciseId_fkey";

-- DropForeignKey
ALTER TABLE "workoutexercises" DROP CONSTRAINT "workoutexercises_workoutId_fkey";

-- DropForeignKey
ALTER TABLE "workouts" DROP CONSTRAINT "workouts_userId_fkey";

-- AlterTable
ALTER TABLE "bodyparts" DROP CONSTRAINT "bodyparts_pkey",
ADD COLUMN     "isSynced" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "bodyparts_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "bodyparts_id_seq";

-- AlterTable
ALTER TABLE "equipment" DROP CONSTRAINT "equipment_pkey",
ADD COLUMN     "isSynced" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "equipment_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "equipment_id_seq";

-- AlterTable
ALTER TABLE "exercises" DROP CONSTRAINT "exercises_pkey",
ADD COLUMN     "isDefaultExercise" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "bodyPartId" SET DATA TYPE TEXT,
ALTER COLUMN "equipmentId" SET DATA TYPE TEXT,
ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "exercises_id_seq";

-- AlterTable
ALTER TABLE "sessionexercises" DROP CONSTRAINT "sessionexercises_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "sessionId" SET DATA TYPE TEXT,
ALTER COLUMN "exerciseId" SET DATA TYPE TEXT,
ADD CONSTRAINT "sessionexercises_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "sessionexercises_id_seq";

-- AlterTable
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_pkey",
DROP COLUMN "isFromDefaultTemplate",
DROP COLUMN "isSyncedOnce",
ADD COLUMN     "derivedWorkoutId" TEXT,
ADD COLUMN     "exerciseCount" INTEGER NOT NULL,
ADD COLUMN     "isFromDefaultWorkout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "setCount" INTEGER NOT NULL,
ADD COLUMN     "updatedWorkoutAt" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "workoutId" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TEXT,
ALTER COLUMN "completedAt" SET DATA TYPE TEXT,
ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "sessions_id_seq";

-- AlterTable
ALTER TABLE "sessionsets" DROP CONSTRAINT "sessionsets_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "sessionExerciseId" SET DATA TYPE TEXT,
ALTER COLUMN "reps" SET NOT NULL,
ALTER COLUMN "weight" SET NOT NULL,
ADD CONSTRAINT "sessionsets_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "sessionsets_id_seq";

-- AlterTable
ALTER TABLE "sets" DROP CONSTRAINT "sets_pkey",
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "workoutExerciseId" SET DATA TYPE TEXT,
ALTER COLUMN "targetWeight" SET DATA TYPE DOUBLE PRECISION,
ADD CONSTRAINT "sets_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "sets_id_seq";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "email",
DROP COLUMN "passwordHash",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "users_id_seq";

-- AlterTable
ALTER TABLE "workoutexercises" DROP CONSTRAINT "workoutexercises_pkey",
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "workoutId" SET DATA TYPE TEXT,
ALTER COLUMN "exerciseId" SET DATA TYPE TEXT,
ADD CONSTRAINT "workoutexercises_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "workoutexercises_id_seq";

-- AlterTable
ALTER TABLE "workouts" DROP CONSTRAINT "workouts_pkey",
DROP COLUMN "isDefaultTemplate",
ADD COLUMN     "exerciseCount" INTEGER NOT NULL,
ADD COLUMN     "isDefaultWorkout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "setCount" INTEGER NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "createdAt" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TEXT,
ADD CONSTRAINT "workouts_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "workouts_id_seq";

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_bodyPartId_fkey" FOREIGN KEY ("bodyPartId") REFERENCES "bodyparts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workoutexercises" ADD CONSTRAINT "workoutexercises_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workoutexercises" ADD CONSTRAINT "workoutexercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workoutexercises" ADD CONSTRAINT "workoutexercises_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sets" ADD CONSTRAINT "sets_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "workoutexercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sets" ADD CONSTRAINT "sets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessionexercises" ADD CONSTRAINT "sessionexercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessionexercises" ADD CONSTRAINT "sessionexercises_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessionsets" ADD CONSTRAINT "sessionsets_sessionExerciseId_fkey" FOREIGN KEY ("sessionExerciseId") REFERENCES "sessionexercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
