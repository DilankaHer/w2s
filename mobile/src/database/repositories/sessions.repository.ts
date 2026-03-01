import * as SessionTypes from "@w2s/shared/types/sessions.types";
import { and, eq, inArray } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { db } from "../database";
import {
  sessionExercises,
  sessions,
  sessionSets,
  workouts,
} from "../schema/schemas";
import { insertDeletedRows } from "./delete-rows.repository";
import { UpdateSessionInput } from "../interfaces/session.interfaces";

export async function getSessions() {
  return await db.query.sessions.findMany({
    orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
  });
}

export async function getSessionById(
  id: string,
) {
  return await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.id, id),
    with: {
      sessionExercises: {
        with: {
          exercise: {
            with: {
              bodyPart: true,
              equipment: true,
            },
          },
          sessionSets: {
            orderBy: (sessionSets, { asc }) => [asc(sessionSets.setNumber)],
          },
        },
        orderBy: (se, { asc }) => [asc(se.order)],
      },
    },
  });
}

export async function deleteSession(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id)).returning().then(async ([session]) => {
    if (session && session.isSynced) {
      await insertDeletedRows([{ tableName: 'sessions', rowId: session.id }]);
    }
  });
}

export async function createSession(
  sessionId: string,
  workoutId: string,
) {
  return await db.transaction(async (tx) => {
    const newSessionId = Crypto.randomUUID();
    let newSession: SessionTypes.Session = {} as SessionTypes.Session;
    let newSessionExercises: SessionTypes.SessionExercise[] = [];
    let newSessionSets: SessionTypes.SessionSet[] = [];

    if (workoutId) {
      const workout = await tx.query.workouts.findFirst({
        where: eq(workouts.id, workoutId),
        with: {
          workoutExercises: {
            with: {
              sets: true,
            },
          },
        },
      });
      if (!workout) {
        throw new Error("Workout not found");
      }
      newSession = {
        id: newSessionId,
        workoutId: workoutId,
        createdAt: new Date().toISOString(),
        isFromDefaultWorkout: workout.isDefaultWorkout,
        name: workout.name,
        exerciseCount: workout.exerciseCount,
        setCount: workout.setCount,
      };
      for (const we of workout.workoutExercises) {
        const newSessionExerciseId = Crypto.randomUUID();
        newSessionExercises.push({
          id: newSessionExerciseId,
          sessionId: newSessionId,
          exerciseId: we.exerciseId,
          order: we.order,
        });
        newSessionSets.push(
          ...we.sets.map((set) => ({
            id: Crypto.randomUUID(),
            sessionExerciseId: newSessionExerciseId,
            setNumber: set.setNumber,
            reps: set.targetReps,
            weight: set.targetWeight,
          })),
        );
      }
    } else if (sessionId) {
      const session = await tx.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
        with: {
          sessionExercises: {
            with: {
              sessionSets: true,
            },
          },
        },
      });
      if (!session) {
        throw new Error("Session not found");
      }
      newSession = {
        id: newSessionId,
        workoutId: session.workoutId,
        createdAt: new Date().toISOString(),
        isFromDefaultWorkout: session.isFromDefaultWorkout,
        name: session.name,
        exerciseCount: session.exerciseCount,
        setCount: session.setCount,
      };
      for (const se of session.sessionExercises) {
        const newSessionExerciseId = Crypto.randomUUID();
        newSessionExercises.push({
          id: newSessionExerciseId,
          sessionId: newSessionId,
          exerciseId: se.exerciseId,
          order: se.order,
        });
        newSessionSets.push(
          ...se.sessionSets.map((set) => ({
            id: Crypto.randomUUID(),
            sessionExerciseId: newSessionExerciseId,
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight,
          })),
        );
      }
    }
    await tx.insert(sessions).values(newSession);
    await tx.insert(sessionExercises).values(newSessionExercises);
    await tx.insert(sessionSets).values(newSessionSets);
    return await tx.query.sessions.findFirst({
      where: eq(sessions.id, newSessionId),
      with: {
        sessionExercises: {
          with: {
            exercise: {
              with: {
                bodyPart: true,
                equipment: true,
              },
            },
            sessionSets: {
              orderBy: (sessionSets, { asc }) => [asc(sessionSets.setNumber)],
            },
          },
          orderBy: (sessionExercises, { asc }) => [asc(sessionExercises.order)],
        },
      },
    });
  });
}

export async function updateSession(
  session: UpdateSessionInput,
) {
  await db.transaction(async (tx) => {
    let exerciseCount = 0;
    let setCount = 0;
    const existingExerciseIds = new Set(
      (
        await tx
          .select({ exerciseId: sessionExercises.exerciseId })
          .from(sessionExercises)
          .where(eq(sessionExercises.sessionId, session.id))
      ).map((e) => e.exerciseId),
    );

    await tx
      .update(sessions)
      .set({
        name: session.name,
        completedAt: session.completedAt,
        sessionTime: session.sessionTime,
      })
      .where(eq(sessions.id, session.id));

    let sessionSetsToAdd: SessionTypes.SessionSet[] = [];
    for (const se of session.sessionExercises) {
      let sessionExerciseId = se.id;
      if (existingExerciseIds.has(se.exerciseId)) {
        await tx.delete(sessionSets).where(eq(sessionSets.sessionExerciseId, se.id));
        await tx
          .update(sessionExercises)
          .set({
            order: se.order,
          })
          .where(eq(sessionExercises.id, se.id));
        existingExerciseIds.delete(se.exerciseId);
      } else {
        sessionExerciseId = Crypto.randomUUID();
        await tx.insert(sessionExercises).values({
          id: sessionExerciseId,
          sessionId: session.id,
          exerciseId: se.exerciseId,
          order: se.order,
        });
      }
      sessionSetsToAdd.push(...se.sessionSets!.map(s => ({
        id: Crypto.randomUUID(),
        sessionExerciseId: sessionExerciseId,
        setNumber: s.setNumber,
        reps: s.reps,
        weight: s.weight,
      })));
      exerciseCount++;
      setCount += se.sessionSets?.length ?? 0;
    }
    if (existingExerciseIds.size > 0) {
      await tx
        .delete(sessionExercises)
        .where(
          and(
            eq(sessionExercises.sessionId, session.id),
            inArray(
              sessionExercises.exerciseId,
              Array.from(existingExerciseIds),
            ),
          ),
        );
    }
    if (sessionSetsToAdd.length > 0) {
      await tx.insert(sessionSets).values(sessionSetsToAdd);
    }
    await tx
      .update(sessions)
      .set({
        exerciseCount,
        setCount,
      })
      .where(eq(sessions.id, session.id));
  });
  return await db.query.sessions.findFirst({
    where: eq(sessions.id, session.id),
    with: {
      sessionExercises: {
        with: {
          exercise: {
            with: {
              bodyPart: true,
              equipment: true,
            },
          },
          sessionSets: {
            orderBy: (sessionSets, { asc }) => [asc(sessionSets.setNumber)],
          },
        },
        orderBy: (sessionExercises, { asc }) => [asc(sessionExercises.order)],
      },
    },
  });
}

export async function getSessionsToSync(): Promise<SessionTypes.SessionToSync[]> {
  return await db.query.sessions.findMany({
    where: eq(sessions.isSynced, false),
    with: {
      sessionExercises: {
        with: {
          sessionSets: true,
        },
      },
    },
  });
}

export async function updateSessionsSynced() {
  await db.update(sessions).set({
    isSynced: true,
  }).where(eq(sessions.isSynced, false));
}