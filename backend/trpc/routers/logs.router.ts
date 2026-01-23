import z from "zod"
import { prisma } from "../../prisma/client"
import { publicProcedure, router } from "../trpc"


export const logsRouter = router({
    createMany: publicProcedure
        .input(z.array(z.object({
            sessionId: z.number(),
            exerciseId: z.number(),
            setNumber: z.number(),
            reps: z.number(),
            weight: z.number(),
        })))
        .mutation(async ({ input: logs }) => {
            return prisma.log.createMany({
                data: logs,
            })
        })
})