import { createBunServeHandler } from 'trpc-bun-adapter';
import { appRouter } from './trpc/router.ts';
import { createContext } from './trpc/utils/context.ts';

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
    }
    return new Response('OK', { status: 200 });
  }
});
console.log('Server is running on port 3000');
