import z from "zod";
import { prisma } from "../../prisma/client";
import { SessionUpdateInput } from "../interfaces/sessions.interface";
import { protectedProcedure } from "../middleware/auth.middleware";
import { publicProcedure, router } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  SessionsSchema,
  SessionsSchemaToSync,
} from "@w2s/shared/types/sessions.types";

const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

export const sessionsRouter = router({
  syncSessions: protectedProcedure
    .input(SessionsSchemaToSync)
    .query(async ({ input, ctx }) => {
      await prisma.$transaction(async (tx) => {
        for (const session of input) {
          await prisma.session.create({
            data: {
              id: session.id,
              name: session.name,
              completedAt: session.completedAt,
              sessionTime: session.sessionTime,
              exerciseCount: session.exerciseCount,
              setCount: session.setCount,
              updatedWorkoutAt: session.updatedWorkoutAt,
              derivedWorkoutId: session.derivedWorkoutId,
              createdAt: session.createdAt,
              isFromDefaultWorkout: session.isFromDefaultWorkout,
              userId: ctx.user.userId,
              workoutId: session.workoutId,
              sessionExercises: {
                create: session.sessionExercises.map((se) => ({
                  id: se.id,
                  sessionId: session.id,
                  exerciseId: se.exerciseId,
                  order: se.order,
                  sessionSets: {
                    create: se.sessionSets.map((set) => ({
                      id: set.id,
                      sessionExerciseId: se.id,
                      setNumber: set.setNumber,
                      reps: set.reps,
                      weight: set.weight,
                    })),
                  },
                })),
              },
            },
          });
        }
      });
    }),
});
