import z from "zod"
import { prisma } from "../../prisma/client"
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
    create: publicProcedure
        .input(z.object({
            templateId: z.number(),
        }))
        .mutation(async ({ input }) => {
            return prisma.session.create({
                data: input,
                include: {
                    template: {
                        include: {
                            exercises: {
                                include: {
                                    exercise: true,
                                    sets: {
                                        orderBy: { setNumber: "asc" },
                                    },
                                },
                                orderBy: { order: "asc" },
                            },
                        },
                    },
                },
            })
        }),
    getById: publicProcedure
        .input(z.object({
            id: z.number(),
        }))
        .query(async ({ input }) => {
            return prisma.session.findUnique({
                where: { id: input.id },
                include: {
                    template: {
                        include: {
                            exercises: {
                                include: {
                                    exercise: true,
                                    sets: {
                                        orderBy: { setNumber: "asc" },
                                    },
                                },
                                orderBy: { order: "asc" },
                            },
                        },
                    },
                },
            })
        }),
    getAll: publicProcedure
        .input(z.object({
            take: z.number().optional(),
            skip: z.number().optional(),
        }))
        .query(async ({ input }) => {
            return prisma.session.findMany({
                take: input?.take ?? undefined,
                skip: input?.skip ?? 0,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    templateId: true,
                    createdAt: true,
                    completedAt: true,
                    sessionTime: true,
                },
            })
        }),
    update: publicProcedure
        .input(z.object({
            id: z.number(),
            createdAt: z.coerce.date(),
            completedAt: z.coerce.date(),
        }))
        .mutation(async ({ input }) => {
            return prisma.session.update({
                where: { id: input.id },
                data: {
                    completedAt: input.completedAt,
                    sessionTime: formatTime((input.completedAt.getTime() - input.createdAt.getTime()) / 1000),
                },
            })
        }),
    delete: publicProcedure
        .input(z.object({
            id: z.number(),
        }))
        .mutation(async ({ input }) => {
            return prisma.session.delete({
                where: { id: input.id },
            })
        })
})