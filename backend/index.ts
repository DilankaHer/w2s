import { createBunServeHandler } from 'trpc-bun-adapter'
import { appRouter } from './trpc/router.ts'

const trpcHandler = createBunServeHandler({
  router: appRouter,
  endpoint: '/',
});

Bun.serve({
  port: 3000,
  websocket: trpcHandler.websocket,
  fetch: async (req, server) => {
    const origin = req.headers.get('origin');

    // Preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin ?? '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type',
        },
      });
    }

    // Delegate to tRPC
    const res = await trpcHandler.fetch(req, server);

    if (res) {
      // Add CORS headers
      res.headers.set('Access-Control-Allow-Origin', origin ?? '*');
      res.headers.set('Access-Control-Allow-Headers', 'content-type');
      return res;
    } else {
      // fallback in case res is undefined (should not happen, but for type safety)
      return new Response('Not Found', { status: 404 });
    }
  }
});

console.log('🚀 tRPC server running at http://localhost:3000');