import z from "zod"
import { prisma } from "../../prisma/client"
import { SessionUpdateInput } from "../interfaces/session.interface"
import { protectedProcedure } from "../middleware/auth.middleware"
import { publicProcedure, router } from "../trpc"

const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hrs > 0) {
        return `${hrs}h ${mins}m ${secs}s`
    } else if (mins > 0) {
        return `${mins}m ${secs}s`
    }
    return `${secs}s`
}

export const sessionsRouter = router({
    create: protectedProcedure
        .input(z.object({
            workoutId: z.number().optional(),
            sessionId: z.number().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (input.workoutId) {
                const workout = await prisma.workout.findUnique({
                    where: { id: input.workoutId },
                    include: {
                        workoutExercises: {
                            include: {
                                exercise: true,
                                sets: true
                            },
                        },
                    },
                });
                return await prisma.session.create({
                    data: {
                        name: workout!.name,
                        userId: ctx.user.userId,
                        workoutId: input.workoutId,
                        createdAt: new Date(),
                        isFromDefaultTemplate: workout!.isDefaultTemplate,
                        sessionExercises: {
                            create: workout!.workoutExercises.map(ex => ({
                                exerciseId: ex.exercise.id,
                                order: ex.order,
                                sessionSets: {
                                    create: ex.sets.map(set => ({
                                        setNumber: set.setNumber,
                                        reps: set.targetReps,
                                        weight: set.targetWeight,
                                    })),
                                },
                            })),
                        },
                    },
                    include: {
                        sessionExercises: {
                            include: {
                                exercise: true,
                                sessionSets: { orderBy: { setNumber: 'asc' } },
                            },
                            orderBy: { order: 'asc' },
                        },
                    },
                });
            } else if (input.sessionId) {
                const session = await prisma.session.findUnique({
                    where: { id: input.sessionId },
                    include: {
                        sessionExercises: {
                            include: {
                                exercise: true,
                                sessionSets: true
                            },
                        },
                    },
                });
                return await prisma.session.create({
                    data: {
                        name: session!.name,
                        userId: ctx.user.userId,
                        workoutId: session!.workoutId ?? undefined,
                        createdAt: new Date(),
                        isFromDefaultTemplate: session!.isFromDefaultTemplate,
                        sessionExercises: {
                            create: session!.sessionExercises.map(ex => ({
                                exerciseId: ex.exercise.id,
                                order: ex.order,
                                sessionSets: {
                                    create: ex.sessionSets.map(set => ({
                                        setNumber: set.setNumber,
                                        reps: set.reps,
                                        weight: set.weight,
                                    })),
                                },
                            })),
                        },
                    },
                    include: {
                        sessionExercises: {
                            include: {
                                exercise: true,
                                sessionSets: { orderBy: { setNumber: 'asc' } },
                            },
                            orderBy: { order: 'asc' },
                        },
                    },
                });
            } else {
                throw new Error("No workout or session ID provided");
            }
        }),

    createUnprotected: publicProcedure
        .input(z.object({
            workoutId: z.number()
        }))
        .mutation(async ({ input }) => {
            const workout = await prisma.workout.findUnique({
                where: { id: input.workoutId },
                include: {
                    workoutExercises: {
                        include: {
                            exercise: true,
                            sets: true
                        },
                    },
                },
            });
            return await prisma.session.create({
                data: {
                    name: workout!.name,
                    userId: null,
                    workoutId: input.workoutId,
                    createdAt: new Date(),
                    isFromDefaultTemplate: workout!.isDefaultTemplate,
                    sessionExercises: {
                        create: workout!.workoutExercises.map(ex => ({
                            exerciseId: ex.exercise.id,
                            order: ex.order,
                            sessionSets: {
                                create: ex.sets.map(set => ({
                                    setNumber: set.setNumber,
                                    reps: set.targetReps,
                                    weight: set.targetWeight,
                                })),
                            },
                        })),
                    },
                },
                include: {
                    sessionExercises: {
                        include: {
                            exercise: true,
                            sessionSets: { orderBy: { setNumber: 'asc' } },
                        },
                        orderBy: { order: 'asc' },
                    },
                },
            });
        }),

    getById: protectedProcedure
        .input(z.object({
            id: z.number(),
        }))
        .query(async ({ input }) => {
            return prisma.session.findUnique({
                where: { id: input.id },
                include: {
                    sessionExercises: {
                        include: {
                            exercise: true,
                            sessionSets: { orderBy: { setNumber: "asc" } },
                        },
                        orderBy: { order: "asc" },
                    },
                },
            })
        }),
    getAll: protectedProcedure
        .input(z.object({
            take: z.number().optional(),
            skip: z.number().optional(),
        }))
        .query(async ({ input }) => {
            return prisma.session.findMany({
                orderBy: { createdAt: "desc" },
                ...(input?.skip !== undefined && { skip: input.skip }),
                ...(input?.take !== undefined && { take: input.take }),
                select: {
                    id: true,
                    createdAt: true,
                    completedAt: true,
                    sessionTime: true,
                },
            })
        }),
    // update: protectedProcedure
    //     .input(z.object({
    //         id: z.number(),
    //         createdAt: z.coerce.date(),
    //         completedAt: z.coerce.date(),
    //         userId: z.number().optional(),
    //     }))
    //     .mutation(async ({ input }) => {
    //         await prisma.sessionSet.deleteMany({
    //             where: {
    //                 sessionExercise: {
    //                     sessionId: input.id,
    //                 },
    //                 isCompleted: false,
    //             }
    //         });
    //         await prisma.sessionExercise.deleteMany({
    //             where: {
    //                 sessionId: input.id,
    //                 sessionSets: {
    //                     none: {},
    //                 },
    //             },
    //         });
    //         return prisma.session.update({
    //             where: { id: input.id },
    //             data: {
    //                 completedAt: input.completedAt,
    //                 sessionTime: formatTime((input.completedAt.getTime() - input.createdAt.getTime()) / 1000),
    //                 ...(input.userId !== undefined && { userId: input.userId }),
    //             },
    //             include: {
    //                 sessionExercises: {
    //                     include: {
    //                         exercise: true,
    //                         sessionSets: { orderBy: { setNumber: 'asc' } },
    //                     },
    //                     orderBy: { order: 'asc' },
    //                 },
    //             },
    //         })
    //     }),

    update: protectedProcedure
        .input(SessionUpdateInput)
        .mutation(async ({ input }) => {
            return await prisma.$transaction(async (tx) => {
                await tx.sessionExercise.deleteMany({
                    where: { id: { in: input.sessionExercisesRemove } },
                });
                await tx.sessionSet.deleteMany({
                    where: { id: { in: input.sessionSetsRemove } },
                });
                await Promise.all(input.sessionExercisesAdd.map(ex =>
                    tx.sessionExercise.create({
                        data: {
                            sessionId: input.sessionId,
                            exerciseId: ex.exerciseId,
                            order: ex.order,
                            sessionSets: {
                                create: ex.sessionSets.map(set => ({
                                    setNumber: set.setNumber,
                                    reps: set.reps,
                                    weight: set.weight,
                                })),
                            },
                        },
                    })
                ));
                await Promise.all(
                    input.sessionExercisesUpdate.map(ex =>
                        tx.sessionExercise.update({
                            where: { id: ex.exerciseId },
                            data: {
                                order: ex.order,
                                sessionSets: {
                                    ...(ex.sessionSetsUpdate.length > 0 && {
                                        update: ex.sessionSetsUpdate.map(set => ({
                                            where: { id: set.sessionSetId },
                                            data: {
                                                setNumber: set.setNumber,
                                                reps: set.reps,
                                                weight: set.weight,
                                            },
                                        })),
                                    }),
                                    ...(ex.sessionSetsAdd.length > 0 && {
                                        create: ex.sessionSetsAdd.map(set => ({
                                            setNumber: set.setNumber,
                                            reps: set.reps,
                                            weight: set.weight,
                                        })),
                                    }),
                                },
                            },
                        })
                    )
                );
                return await tx.session.update({
                    where: { id: input.sessionId },
                    data: {
                        completedAt: input.completedAt,
                        sessionTime: formatTime((input.completedAt.getTime() - input.createdAt.getTime()) / 1000),
                        ...(input.userId !== undefined && { userId: input.userId }),
                    },
                    include: {
                        sessionExercises: {
                            include: {
                                exercise: true,
                                sessionSets: { orderBy: { setNumber: 'asc' } },
                            },
                            orderBy: { order: 'asc' },
                        },
                    },
                });
            });
        }),

    delete: publicProcedure
        .input(z.object({
            id: z.number(),
        }))
        .mutation(async ({ input }) => {
            return prisma.session.delete({
                where: { id: input.id },
            })
        }),

    updateSessionSets: publicProcedure
        .input(z.object({
            setId: z.number(),
            setNumber: z.number(),
            reps: z.number().optional(),
            weight: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
            return prisma.sessionSet.update({
                where: { id: input.setId },
                data: {
                    setNumber: input.setNumber,
                    ...(input.reps !== undefined && { reps: input.reps }),
                    ...(input.weight !== undefined && { weight: input.weight }),
                },
            })
        })
})