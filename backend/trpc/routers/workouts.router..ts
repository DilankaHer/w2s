// backend/trpc/routers/workouts.router.ts
import { prisma } from "../../prisma/client";
import { protectedProcedure } from "../middleware/auth.middleware";
import { SetsSchema, WorkoutExercisesSchema, WorkoutsSchema } from "@w2s/shared/index";
import { router } from "../trpc";

export const workoutsRouter = router({
  getWorkoutsToSync: protectedProcedure.query(async () => {
    return prisma.workout.findMany({
      where: {
        isDefaultWorkout: true,
      },
      include: {
        workoutExercises: {
          include: {
            sets: true,
          },
        },
      },
    });
  }),
  syncWorkouts: protectedProcedure.input(WorkoutsSchema).query(async ({ input, ctx }) => {
    for (const workout of input) {
      await prisma.workout.upsert({
        where: { id: workout.id, userId: ctx.user.userId },
        update: {
          name: workout.name,
          exerciseCount: workout.exerciseCount,
          setCount: workout.setCount
        },
        create: {
          id: workout.id,
          name: workout.name,
          exerciseCount: workout.exerciseCount,
          setCount: workout.setCount,
          userId: ctx.user.userId,
          createdAt: workout.createdAt,
          isDefaultWorkout: workout.isDefaultWorkout,
        },
      });
    }
  }),
  syncWorkoutExercises: protectedProcedure.input(WorkoutExercisesSchema).query(async ({ input, ctx }) => {
    for (const workoutExercise of input) {
      await prisma.workoutExercise.upsert({
        where: { id: workoutExercise.id, userId: ctx.user.userId },
        update: {
          exerciseId: workoutExercise.exerciseId,
          order: workoutExercise.order,
        },
        create: {
          id: workoutExercise.id,
          workoutId: workoutExercise.workoutId,
          exerciseId: workoutExercise.exerciseId,
          order: workoutExercise.order,
          userId: ctx.user.userId,
        },
      });
    }
  }),
  syncSets: protectedProcedure.input(SetsSchema).query(async ({ input, ctx }) => {
    for (const set of input) {
      await prisma.set.upsert({
        where: { id: set.id, userId: ctx.user.userId },
        update: {
          setNumber: set.setNumber,
          targetReps: set.targetReps,
          targetWeight: set.targetWeight,
        },
        create: {
          id: set.id,
          workoutExerciseId: set.workoutExerciseId,
          setNumber: set.setNumber,
          targetReps: set.targetReps,
          targetWeight: set.targetWeight,
          userId: ctx.user.userId,
        },
      });
    }
  })
});