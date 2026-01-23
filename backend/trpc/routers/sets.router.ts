import z from "zod"
import { prisma } from "../../prisma/client"
import { publicProcedure, router } from "../trpc"

export const setRouter = router({
    update: publicProcedure
        .input(
            z.object({
                setId: z.number(),
                targetWeight: z.number(),
                targetReps: z.number(),
            })
        )
        .mutation(async ({ input }) => {
            return prisma.set.update({
                where: { id: input.setId },
                data: {
                    targetWeight: input.targetWeight,
                    targetReps: input.targetReps,
                },
            })
        })
})