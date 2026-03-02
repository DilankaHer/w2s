import { createHash, randomBytes } from "crypto";
import { prisma } from "../../prisma/client";
import { publicProcedure, router } from "../trpc";

import { RequestMagicLinkSchema } from "@w2s/shared/types/auth.types";

export const authRouter = router({
    requestMagicLink: publicProcedure.input(RequestMagicLinkSchema).mutation(async ({ input }) => {
        const email = input.email.toLowerCase().trim();
        const randomToken = randomBytes(32).toString("hex");;
        const tokenHash = createHash('sha256').update(randomToken).digest('hex');
        await prisma.magicLinkToken.create({
            data: {
                email: email,
                userId: input.userId,
                username: input.username,
                isMobile: input.isMobile,
                tokenHash: tokenHash,
                expiresAt: new Date(Date.now() + 300000),
            },
        });
    }),
});