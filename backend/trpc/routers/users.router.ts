import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import z from "zod";
import { prisma } from "../../prisma/client";
import { protectedProcedure } from "../middleware/auth.middleware";
import { publicProcedure, router } from "../trpc";
import { createToken } from "../utils/cookie";

export const usersRouter = router({
    create: publicProcedure.input(z.object({ username: z.string(), email: z.email().optional(), password: z.string(), isMobile: z.boolean().optional() })).mutation(async ({ input, ctx }) => {
        const existingUser = await prisma.user.findFirst({
            where: { username: input.username },
        });
        if (existingUser) {
            throw new TRPCError({ code: 'CONFLICT', message: 'Username already exists' });
        }

        const passwordHash = await bcrypt.hash(input.password, 12);
        const user = await prisma.user.create({
            data: {
                username: input.username,
                passwordHash,
                ...(input.email && { email: input.email }),
            },
        });

        createToken(user, ctx, input.isMobile);

        return {
            success: true,
            user: {
                username: user.username
            },
        };
    }),

    login: publicProcedure.input(z.object({ username: z.string(), password: z.string(), isMobile: z.boolean().optional() })).mutation(async ({ input, ctx }) => {
        const user = await prisma.user.findFirst({
            where: { username: input.username },
        });
        if (!user) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
        }

        createToken(user, ctx, input.isMobile);

        return {
            success: true,
            user: {
                username: user.username
            },
        };
    }),

    getUser: protectedProcedure.query(async ({ ctx }) => {
        return prisma.user.findUnique({
            where: { id: ctx.user.userId },
            select: {
                id: true,
                username: true,
                email: true,
            },
        });
    }),

    updateUser: protectedProcedure.input(z.object({
        username: z.string().optional(),
        email: z.email().optional(),
    })).mutation(async ({ input, ctx }) => {
        await prisma.user.update({
            where: { id: ctx.user.userId },
            data: {
                ...(input.username && { username: input.username }),
                ...(input.email && { email: input.email }),
            },
        });

        return {
            success: true,
        };
    }),

    checkUsername: publicProcedure.input(z.object({ username: z.string() })).mutation(async ({ input }) => {
        const existingUser = await prisma.user.findFirst({
            where: { username: input.username },
        });
        return {
            exists: !!existingUser,
        };
    }),

    checkEmail: publicProcedure.input(z.object({ email: z.string() })).mutation(async ({ input }) => {
        const existingUser = await prisma.user.findFirst({
            where: { email: input.email },
        });
        return {
            exists: !!existingUser,
        };
    }),

    getWorkoutInfo: protectedProcedure.mutation(async ({ ctx }) => {
        return prisma.user.findUnique({
            where: { id: ctx.user.userId },
            select: {
                username: true,
                workouts: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
                sessions: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
        });
    }),
});