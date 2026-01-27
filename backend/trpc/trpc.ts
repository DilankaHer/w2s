import { initTRPC } from '@trpc/server';
import { createContext } from './utils/context';

const t = initTRPC.context<typeof createContext>().create(
    {
        errorFormatter({ shape }) {
            return {
                ...shape,
                data: {
                    code: shape.data.code,
                    httpStatus: shape.data.httpStatus,
                },
            };
        }
    },
);

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;