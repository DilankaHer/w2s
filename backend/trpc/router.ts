import { exercisesRouter } from './routers/exercises.router';
import { sessionsRouter } from './routers/sessions.router';
import { setRouter } from './routers/sets.router';
import { serverRouter } from './routers/server.router';
import { usersRouter } from './routers/users.router';
import { workoutsRouter } from './routers/workouts.router.';
import { router } from './trpc';
import { statsRouter } from './routers/stats.router';

export const appRouter = router({
  server: serverRouter,
  users: usersRouter,
  workouts: workoutsRouter,
  exercises: exercisesRouter,
  sets: setRouter,
  sessions: sessionsRouter,
  stats: statsRouter,
});

export type AppRouter = typeof appRouter;
