import z from "zod"
import { prisma } from "../../prisma/client"
import { router } from "../trpc"
import { protectedProcedure } from "../middleware/auth.middleware"

export const setRouter = router({
    update: protectedProcedure
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