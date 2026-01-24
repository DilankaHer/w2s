// backend/trpc/routers/workouts.router.ts
import { templateLiteral, z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "../../prisma/client";
import { WorkoutCreateInput } from "../interfaces/workout.interface";

export const workoutsRouter = router({
  create: publicProcedure
    .input(z.object({ workout: WorkoutCreateInput }))
    .mutation(async ({ input }) => {
      return prisma.workout.create({
        data: {
          name: input.workout.name,
          isTemplate: input.workout.isTemplate,
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

  getTemplates: publicProcedure.query(async () => {
    return prisma.workout.findMany({
      where: { isTemplate: true },
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
      return prisma.workout.findUnique({
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
    }),

    // update: publicProcedure
    // .input(z.object({ id: z.number(), exercises: z.array(z.object({ id: z.number(), order: z.number(), sets: z.array(z.object({ id: z.number(), setNumber: z.number(), targetReps: z.number(), targetWeight: z.number() })) })) }))
    // .mutation(async ({ input }) => {
    //   for (const exercise of input.exercises) {
    //     await prisma.workoutExercise.update({
    //       where: { id: exercise.id },
    //       data: { order: exercise.order, sets: { deleteMany: {}, create: exercise.sets.map(set => ({ setNumber: set.setNumber, targetReps: set.targetReps, targetWeight: set.targetWeight })) } },
    //     });
    //   }
    //   return prisma.workout.update({
    //     where: { id: input.id },
    //     data: { exercises: { deleteMany: {}, create: input.exercises.map(exercise => ({ exerciseId: exercise.id, order: exercise.order, sets: exercise.sets.map(set => ({ setNumber: set.setNumber, targetReps: set.targetReps, targetWeight: set.targetWeight })) })) } },
    //   });
    // }),
});
