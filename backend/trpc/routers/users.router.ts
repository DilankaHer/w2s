import { UserSchema } from "@w2s/shared/types/user.types";
import { prisma } from "../../prisma/client";
import { protectedProcedure } from "../middleware/auth.middleware";
import { router } from "../trpc";

export const usersRouter = router({
    syncUser: protectedProcedure.input(UserSchema).mutation(async ({ input, ctx }) => {
        await prisma.user.update({
            where: { id: ctx.user.userId },
            data: {
                username: input.username,
            },
        });
    }),
});