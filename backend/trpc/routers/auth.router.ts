import { createHash, randomBytes } from "crypto";
import { prisma } from "../../prisma/client";
import { publicProcedure, router } from "../trpc";

import { RequestMagicLinkSchema } from "@w2s/shared/types/auth.types";
import { sendMagicLinkEmail } from "../../services/email.service";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
    requestMagicLink: publicProcedure.input(RequestMagicLinkSchema).mutation(async ({ input }) => {
        try {
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
            await sendMagicLinkEmail(email, randomToken);
            return "Magic link sent to email";
        } catch (error) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to send magic link', cause: error });
        }
    }),
});