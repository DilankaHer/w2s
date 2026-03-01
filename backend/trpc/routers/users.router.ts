import { prisma } from "../../prisma/client";
import { protectedProcedure } from "../middleware/auth.middleware";
import { publicProcedure, router } from "../trpc";
import { createToken } from "../utils/cookie";
import { UserSchema, UserSchemaCreate } from "@w2s/shared/types/user.types";

export const usersRouter = router({
    createNewToken: publicProcedure.input(UserSchemaCreate).mutation(async ({ input, ctx }) => {
        const user = await prisma.user.findUnique({
            where: { id: input.id },
        });
        if (!user) {
            const user = await prisma.user.create({
                data: {
                    id: input.id,
                    username: input.username,
                    createdAt: input.createdAt,
                },
            });
            createToken(user, ctx, true);
        } else {
            createToken(user, ctx, true);
        }
        return "New token created";
    }),
    syncUser: protectedProcedure.input(UserSchema).mutation(async ({ input, ctx }) => {
        await prisma.user.update({
            where: { id: ctx.user.userId },
            data: {
                username: input.username,
            },
        });
    }),
});