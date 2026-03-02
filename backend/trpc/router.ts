import { exercisesRouter } from "./routers/exercises.router";
import { sessionsRouter } from "./routers/sessions.router";
import { serverRouter } from "./routers/server.router";
import { usersRouter } from "./routers/users.router";
import { workoutsRouter } from "./routers/workouts.router.";
import { deleteRowsRouter } from "./routers/delete-rows.router";
import { router } from "./trpc";
import { authRouter } from "./routers/auth.router";

export const appRouter = router({
  server: serverRouter,
  users: usersRouter,
  workouts: workoutsRouter,
  exercises: exercisesRouter,
  sessions: sessionsRouter,
  deleteRows: deleteRowsRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
