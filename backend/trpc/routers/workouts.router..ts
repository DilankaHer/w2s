// backend/trpc/routers/workouts.router.ts
import { z } from "zod";
import { prisma } from "../../prisma/client";
import { WorkoutCreateInput } from "../interfaces/workouts.interface";
import { protectedProcedure } from "../middleware/auth.middleware";
import { publicProcedure, router } from "../trpc";
import { TRPCError } from "@trpc/server";

export const workoutsRouter = router({
  create: protectedProcedure
    .input(z.object({ workout: WorkoutCreateInput }))
    .mutation(async ({ input, ctx }) => {
      if (!/^[a-zA-Z0-9\s-]+$/.test(input.workout.name)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Workout name can only contain letters, numbers, spaces, and hyphens" });
      }
      return prisma.workout.create({
        data: {
          name: input.workout.name,
          userId: ctx.user.userId,
          workoutExercises: {
            create: input.workout.workoutExercises.map(exercise => ({
              exerciseId: exercise.id,
              order: exercise.order,
              sets: {
                create: exercise.sets.map(set => ({ setNumber: set.setNumber, targetReps: set.targetReps, targetWeight: set.targetWeight }))
              }
            }))
          }
        }
      });
    }),

  list: publicProcedure.query(async () => {
    return prisma.workout.findMany({
      include: {
        workoutExercises: {
          include: {
            exercise: true,
            sets: {
              orderBy: { setNumber: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getWorkouts: publicProcedure.input(z.object({ isDefaultWorkout: z.boolean().optional().default(false) })).query(async ({ input }) => {
    return prisma.workout.findMany({
      where: { isDefaultWorkout: input.isDefaultWorkout },
      include: {
        workoutExercises: {
          include: {
            exercise: true,
            sets: {
              orderBy: { setNumber: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getWorkoutsByUser: protectedProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
    return prisma.workout.findMany({
      where: { userId: input.userId },
      include: {
        workoutExercises: {
          include: {
            exercise: true,
            sets: {
              orderBy: { setNumber: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const workout = await prisma.workout.findUnique({
        where: { id: input.id },
        include: {
          workoutExercises: {
            include: {
              exercise: true,
              sets: {
                orderBy: { setNumber: "asc" },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      });
      return workout;
    }),

  update: protectedProcedure
    .input(z.object({ 
      id: z.number(), 
      name: z.string().regex(/^[a-zA-Z0-9\s-]+$/, "Workout name can only contain letters, numbers, spaces, and hyphens")
    }))
    .mutation(async ({ input }) => {
      return prisma.workout.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  updateBySession: protectedProcedure
    .input(z.object({ sessionId: z.number(), workoutId: z.number() }))
    .mutation(async ({ input }) => {
      await prisma.$transaction(async (tx) => {
        const sessionExercises = await tx.sessionExercise.findMany({
          where: {
            sessionId: input.sessionId,
          },
          include: {
            sessionSets: {
              orderBy: { setNumber: 'asc' },
            },
          },
        });
        for (const sessionExercise of sessionExercises) {
          const workoutExercise = await tx.workoutExercise.findUnique({
            where: {
              workoutId_exerciseId: {
                workoutId: input.workoutId,
                exerciseId: sessionExercise.exerciseId,
              },
            },
            include: {
              sets: true,
            },
          });
          if (workoutExercise === null) {
            await tx.workoutExercise.create({
              data: {
                workoutId: input.workoutId,
                exerciseId: sessionExercise.exerciseId,
                order: sessionExercise.order,
                sets: {
                  create: sessionExercise.sessionSets.map(set => ({
                    setNumber: set.setNumber,
                    targetReps: set.reps ?? 0,
                    targetWeight: set.weight ?? 0,
                  })),
                },
              },
            });
          } else {
            const noOfSessionSets = sessionExercise.sessionSets.length;
            const noOfWorkoutSets = workoutExercise ? workoutExercise.sets.length : 0;
            let remainingSets = noOfWorkoutSets;
            for (const sessionSet of sessionExercise.sessionSets) {
              if (remainingSets === 0) {
                await tx.set.create({
                  data: {
                    workoutExerciseId: workoutExercise!.id,
                    setNumber: sessionSet.setNumber,
                    targetReps: sessionSet.reps ?? 0,
                    targetWeight: sessionSet.weight ?? 0,
                  },
                });
                continue;
              }
              await tx.set.update({
                where: { setNumber_workoutExerciseId: { setNumber: sessionSet.setNumber, workoutExerciseId: workoutExercise!.id } },
                data: {
                  targetReps: sessionSet.reps ?? 0,
                  targetWeight: sessionSet.weight ?? 0,
                },
              });
              remainingSets--;
            }
            if (remainingSets > 0) {
              await tx.set.deleteMany({
                where: { setNumber: { in: Array.from({ length: remainingSets }, (_, index) => index + noOfSessionSets + 1) }, workoutExerciseId: workoutExercise!.id },
              });
            }
          }
        }
        await tx.session.update({
          where: { id: input.sessionId },
          data: { isSyncedOnce: true },
        });
      });
    }),

  createBySession: protectedProcedure
    .input(z.object({ sessionId: z.number(), name: z.string().regex(/^[a-zA-Z0-9\s-]+$/, "Workout name can only contain letters, numbers, spaces, and hyphens") }))
    .mutation(async ({ input, ctx }) => {
      await prisma.$transaction(async (tx) => {
        const existingWorkout = await tx.workout.findFirst({
          where: {
            userId: ctx.user.userId,
            OR: [
              { name: { startsWith: input.name + " (" } },
              { name: input.name }
            ]
          },
          orderBy: { createdAt: "desc" },
        });
        if (existingWorkout) {
          const match = existingWorkout.name.match(/\((\d+)\)/);
          const runningNo = match?.[1] ?? "0";
          input.name = `${input.name} (${parseInt(runningNo) + 1})`;
        }
        const session = await tx.session.findUnique({
          where: { id: input.sessionId },
          include: {
            sessionExercises: {
              include: {
                exercise: true,
                sessionSets: {
                  orderBy: { setNumber: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
        });
        if (session === null) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
        }
        const workout = await tx.workout.create({
          data: {
            name: input.name,
            userId: session.userId,
            workoutExercises: {
              create: session.sessionExercises.map(exercise => ({
                exerciseId: exercise.exerciseId,
                order: exercise.order,
                sets: {
                  create: exercise.sessionSets.map(set => ({
                    setNumber: set.setNumber,
                    targetReps: set.reps ?? 0,
                    targetWeight: set.weight ?? 0,
                  })),
                },
              })),
            },
          },
        });
        await tx.session.update({
          where: { id: input.sessionId },
          data: { name: input.name, workoutId: workout.id, isSyncedOnce: true },
        });
      });
      return "Workout created successfully";
    }),

    checkWorkoutName: protectedProcedure.input(z.object({ name: z.string() })).mutation(async ({ input, ctx }) => {
      const existingWorkout = await prisma.workout.findFirst({
        where: { name: input.name, userId: ctx.user.userId },
      });
      return {
        exists: !!existingWorkout,
      };
    }),
});
