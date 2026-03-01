import { TRPCError } from '@trpc/server';
import jwt from 'jsonwebtoken';
import { middleware, publicProcedure } from '../trpc';
import { prisma } from '../../prisma/client';

export const isAuthed = middleware(async ({ ctx, next }) => {
  const token = ctx.getCookie('auth_token');
  if (!token) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET_KEY!) as {
      userId: string;
      username: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
    }

    return next({
      ctx: {
        user: payload, // 👈 strongly typed downstream
      },
    });
  } catch {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  }
});

export const protectedProcedure = publicProcedure.use(isAuthed);

export { middleware };

