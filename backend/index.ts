import cookie, { type SerializeOptions } from 'cookie';
import { createBunServeHandler } from 'trpc-bun-adapter';
import { verifyMagicLink } from './services/auth.service.ts';
import { appRouter } from './trpc/router.ts';
import { createContext } from './trpc/utils/context.ts';
import { createJWTToken } from './trpc/utils/cookie.ts';

const trpcHandler = createBunServeHandler({
  router: appRouter,
  endpoint: '/trpc',
  createContext
});

const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://w2s-app.duvaher.com',
]);

Bun.serve({
  hostname: '0.0.0.0',
  port: 3000,
  websocket: trpcHandler.websocket,
  fetch: async (req, server) => {
    const origin = req.headers.get('origin');
    const url = new URL(req.url);
    const corsOrigin =
      origin && allowedOrigins.has(origin)
        ? origin
        : 'https://w2s-app.duvaher.com';


    // Preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type',
        },
      });
    }

    // Delegate to tRPC
    if (url.pathname.startsWith('/trpc')) {
      const res = await trpcHandler.fetch(req, server);

      if (res) {
        // Add CORS headers
        res.headers.set('Access-Control-Allow-Origin', corsOrigin);
        res.headers.set('Access-Control-Allow-Headers', 'content-type');
        res.headers.set('Access-Control-Allow-Credentials', 'true');
        return res;
      } else {
        // fallback in case res is undefined (should not happen, but for type safety)
        return new Response('Not Found', { status: 404 });
      }
    } else if (url.pathname.startsWith('/auth/verify')) {
      const token = url.searchParams.get('token');
      if (!token) {
        return new Response('Unauthorized', { status: 401 });
      }
      const verificationInfo = await verifyMagicLink(token);
      if (!verificationInfo) {
        return new Response('Invalid or expired token', { status: 401 });
      }

      const headers = new Headers();

      const tokenJWT = await createJWTToken(verificationInfo);

      if (verificationInfo.isMobile) {
        headers.set('Location', `w2smobile://auth-success?token=${tokenJWT}`);
      } else {
        const cookieOptions: SerializeOptions = {
          httpOnly: true,
          path: "/",
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: parseInt(process.env.JWT_EXPIRES_IN!),
        }
        headers.set('Set-Cookie', cookie.serialize("auth_token", tokenJWT, cookieOptions));
        headers.set('Location', 'w2s-app.duvaher.com');
      }
      return new Response(null, {
        status: 302,
        headers,
      });
    }
    return new Response('OK', { status: 200 });
  }
});
console.log('Server is running on port 3000');
