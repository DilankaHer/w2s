import { prisma } from "../../prisma/client";
import type { StatsResponse } from "../interfaces/stats.interface";
import { protectedProcedure } from "../middleware/auth.middleware";
import { router } from "../trpc";

export const statsRouter = router({
    getStats: protectedProcedure.query<StatsResponse>(async ({ ctx }) => {
        const favWorkout = await prisma.session.groupBy({
            where: {
                userId: ctx.user.userId,
            },
            by: ['name'],
            orderBy: {
                _count: {
                    name: 'desc',
                }
            },
            take: 1,
        })
        const totalSessions = await prisma.session.count({
            where: {
                userId: ctx.user.userId,
            },
        })
        const totalExercises = await prisma.sessionExercise.count({
            where: {
                session: {
                    userId: ctx.user.userId,
                },
            },
        })
        const response: StatsResponse = {
            favoriteWorkout: favWorkout && favWorkout[0]?.name || '',
            totalSessions: totalSessions || 0,
            totalExercises: totalExercises || 0,
        }
        return response
    }),
});