import { logsRouter } from './routers/logs.router';
import { sessionsRouter } from './routers/sessions.router';
import { setRouter } from './routers/sets.router';
import { templatesRouter } from './routers/templates.router.';
import { router } from './trpc';

export const appRouter = router({
  templates: templatesRouter,
  sets: setRouter,
  sessions: sessionsRouter,
  logs: logsRouter,
});

export type AppRouter = typeof appRouter;
