import { createHash } from "crypto";
import { prisma } from "../prisma/client";
import type { IAuthService } from "../trpc/interfaces/auth.interface";

export async function verifyMagicLink(token: string): Promise<IAuthService | null> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const magicLinkToken = await prisma.magicLinkToken.findFirst({
        where: { tokenHash: tokenHash, used: false, expiresAt: { gt: new Date() } },
    });
    if (!magicLinkToken) {
        return null;
    }
    await prisma.magicLinkToken.update({
        where: { id: magicLinkToken.id },
        data: { used: true },
    });
    let user = await prisma.user.findUnique({
        where: { email: magicLinkToken.email },
    });
    if (!user) {
        user = await prisma.user.create({
            data: {
                id: magicLinkToken.userId,
                email: magicLinkToken.email,
                username: magicLinkToken.username,
                createdAt: new Date().toISOString(),
            },
        });
    }
    return {
        userId: user.id,
        username: user.username,
        email: user.email,
        isMobile: magicLinkToken.isMobile,
    };
}