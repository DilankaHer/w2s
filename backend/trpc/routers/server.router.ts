import { publicProcedure, router } from "../trpc";

export const serverRouter = router({
    healthCheck: publicProcedure.query(async () => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }),
});