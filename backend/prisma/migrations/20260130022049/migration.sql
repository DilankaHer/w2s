-- DropForeignKey
ALTER TABLE "sets" DROP CONSTRAINT "sets_workoutExerciseId_fkey";

-- DropForeignKey
ALTER TABLE "workoutexercises" DROP CONSTRAINT "workoutexercises_workoutId_fkey";

-- AddForeignKey
ALTER TABLE "workoutexercises" ADD CONSTRAINT "workoutexercises_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sets" ADD CONSTRAINT "sets_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "workoutexercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
