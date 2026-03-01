import { db } from "../database";
import { workouts, workoutExercises, sets, sessions } from "../schema/schemas";
import * as Crypto from "expo-crypto";
import * as WorkoutTypes from "@w2s/shared/types/workouts.types";
import { and, eq, inArray, sql } from "drizzle-orm";
import { insertDeletedRows } from "./delete-rows.repository";
import * as DeletedRowInterface from "../interfaces/deleted-row.interface";
import {
  CreateWorkoutInput,
  updateSetInput,
  UpdateWorkoutInput,
} from "../interfaces/workout.interface";

export async function createWorkout(input: CreateWorkoutInput) {
  const workoutId = Crypto.randomUUID();
  let exerciseCount = 0;
  let setCount = 0;

  await db.transaction(async (tx) => {
    await tx.insert(workouts).values({
      id: workoutId,
      name: input.name,
      isDefaultWorkout: false,
      createdAt: new Date().toISOString(),
    });

    for (const exercise of input.exercises) {
      exerciseCount++;
      const workoutExerciseId = Crypto.randomUUID();

      await tx.insert(workoutExercises).values({
        id: workoutExerciseId,
        workoutId,
        exerciseId: exercise.exerciseId,
        order: exercise.order,
      });

      setCount += exercise.sets.length;

      await tx.insert(sets).values(
        exercise.sets.map((set) => ({
          id: Crypto.randomUUID(),
          workoutExerciseId: workoutExerciseId,
          setNumber: set.setNumber,
          targetReps: set.targetReps,
          targetWeight: set.targetWeight,
        })),
      );
    }

    await tx
      .update(workouts)
      .set({
        exerciseCount,
        setCount,
      })
      .where(eq(workouts.id, workoutId));
  });

  return workoutId;
}

export async function createWorkoutBySession(sessionId: string, name: string) {
  await db.transaction(async (tx) => {
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
    if (session.derivedWorkoutId) {
      throw new Error("Session already has a derived workout");
    }
    const workoutId = Crypto.randomUUID();
    await tx.insert(workouts).values({
      id: workoutId,
      name: name,
      isDefaultWorkout: false,
      createdAt: new Date().toISOString(),
      exerciseCount: session.exerciseCount,
      setCount: session.setCount,
    });
    for (const sessionExercise of session.sessionExercises) {
      const workoutExerciseId = Crypto.randomUUID();
      await tx.insert(workoutExercises).values({
        id: workoutExerciseId,
        workoutId: workoutId,
        exerciseId: sessionExercise.exerciseId,
        order: sessionExercise.order,
      });
      await tx.insert(sets).values(
        sessionExercise.sessionSets.map((set) => ({
          id: Crypto.randomUUID(),
          workoutExerciseId: workoutExerciseId,
          setNumber: set.setNumber,
          targetReps: set.reps,
          targetWeight: set.weight,
        })),
      );
    }
    await tx
      .update(sessions)
      .set({
        derivedWorkoutId: workoutId,
      })
      .where(eq(sessions.id, sessionId));
  });
}

export async function getWorkouts() {
  return await db.query.workouts.findMany({
    orderBy: (workouts, { desc }) => [desc(workouts.createdAt)],
  });
}

export async function getWorkoutById(id: string) {
  return await db.query.workouts.findFirst({
    where: (workouts, { eq }) => eq(workouts.id, id),
    with: {
      workoutExercises: {
        with: {
          exercise: {
            with: {
              bodyPart: true,
              equipment: true,
            },
          },
          sets: {
            orderBy: (sets, { asc }) => [asc(sets.setNumber)],
          },
        },
        orderBy: (we, { asc }) => [asc(we.order)],
      },
    },
  });
}

export async function updateWorkout(workout: UpdateWorkoutInput) {
  await db.transaction(async (tx) => {
    const existingExerciseIds = new Set(
      (
        await tx
          .select({ exerciseId: workoutExercises.exerciseId })
          .from(workoutExercises)
          .where(eq(workoutExercises.workoutId, workout.id))
      ).map((e) => e.exerciseId),
    );
    let exerciseCount = 0;
    let setCount = 0;

    for (const we of workout.workoutExercises) {
      if (existingExerciseIds.has(we.exerciseId)) {
        await tx
          .update(workoutExercises)
          .set({
            order: we.order,
          })
          .where(eq(workoutExercises.id, we.id));

        const existingSetIds = new Set(
          (
            await tx
              .select({ id: sets.id })
              .from(sets)
              .where(eq(sets.workoutExerciseId, we.id))
          ).map((s) => s.id),
        );

        for (const s of we.sets) {
          if (existingSetIds.has(s.id)) {
            await tx
              .update(sets)
              .set({
                setNumber: s.setNumber,
                targetReps: s.targetReps,
                targetWeight: s.targetWeight,
              })
              .where(eq(sets.id, s.id));

            existingSetIds.delete(s.id);
          } else {
            await tx.insert(sets).values({
              id: Crypto.randomUUID(),
              workoutExerciseId: we.id,
              setNumber: s.setNumber,
              targetReps: s.targetReps,
              targetWeight: s.targetWeight,
            });
          }
        }

        if (existingSetIds.size > 0) {
          await tx
            .delete(sets)
            .where(inArray(sets.id, Array.from(existingSetIds)));
        }

        existingExerciseIds.delete(we.exerciseId);
        exerciseCount++;
        setCount += we.sets.length;
      } else {
        const workoutExerciseId = Crypto.randomUUID();
        await tx.insert(workoutExercises).values({
          id: workoutExerciseId,
          workoutId: workout.id,
          exerciseId: we.exerciseId,
          order: we.order,
        });

        await tx.insert(sets).values(
          we.sets.map((s) => ({
            id: Crypto.randomUUID(),
            workoutExerciseId: workoutExerciseId,
            setNumber: s.setNumber,
            targetReps: s.targetReps,
            targetWeight: s.targetWeight,
          })),
        );
        exerciseCount++;
        setCount += we.sets.length;
      }
    }

    if (existingExerciseIds.size > 0) {
      await tx
        .delete(workoutExercises)
        .where(
          and(
            eq(workoutExercises.workoutId, workout.id),
            inArray(
              workoutExercises.exerciseId,
              Array.from(existingExerciseIds),
            ),
          ),
        );
    }

    await tx
      .update(workouts)
      .set({
        name: workout.name,
        exerciseCount,
        setCount,
      })
      .where(eq(workouts.id, workout.id));
  });
}

export async function updateWorkoutBySession(sessionId: string) {
  await db.transaction(async (tx) => {
    let rowsDeleted: DeletedRowInterface.DeletedRow[] = [];
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
    if (session.updatedWorkoutAt) {
      throw new Error("Session has already been updated");
    }
    if (!session.workoutId) {
      throw new Error("Session was not created from a workout");
    }
    const workout = await tx.query.workouts.findFirst({
      where: eq(workouts.id, session.workoutId),
      with: {
        workoutExercises: true,
      },
    });
    if (!workout) {
      throw new Error("Workout not found");
    }
    const exerciseMap = new Map(
      workout.workoutExercises.map((we) => [we.exerciseId, we.id]),
    );
    let workoutSetsToAdd: WorkoutTypes.Set[] = [];
    for (const sessionExercise of session.sessionExercises) {
      let workoutExerciseId = "";
      if (exerciseMap.has(sessionExercise.exerciseId)) {
        workoutExerciseId = exerciseMap.get(sessionExercise.exerciseId)!;
        const deletedSets = await tx
          .delete(sets)
          .where(eq(sets.workoutExerciseId, workoutExerciseId))
          .returning();
        for (const set of deletedSets) {
          if (set.isSynced) {
            rowsDeleted.push({ tableName: "sets", rowId: set.id });
          }
        }
        await tx
          .update(workoutExercises)
          .set({
            order: sessionExercise.order,
          })
          .where(eq(workoutExercises.id, workoutExerciseId));
        exerciseMap.delete(sessionExercise.exerciseId);
      } else {
        workoutExerciseId = Crypto.randomUUID();
        await tx.insert(workoutExercises).values({
          id: workoutExerciseId,
          workoutId: workout.id,
          exerciseId: sessionExercise.exerciseId,
          order: sessionExercise.order,
        });
      }
      workoutSetsToAdd.push(
        ...sessionExercise.sessionSets.map(
          (s) =>
            ({
              id: Crypto.randomUUID(),
              workoutExerciseId: workoutExerciseId,
              setNumber: s.setNumber,
              targetReps: s.reps,
              targetWeight: s.weight,
            }) as WorkoutTypes.Set,
        ),
      );
    }
    if (exerciseMap.size > 0) {
      const deletedWorkoutExercises = await tx
        .delete(workoutExercises)
        .where(
          and(
            eq(workoutExercises.workoutId, workout.id),
            inArray(
              workoutExercises.exerciseId,
              Array.from(exerciseMap.keys()),
            ),
          ),
        )
        .returning();
      for (const workoutExercise of deletedWorkoutExercises) {
        if (workoutExercise.isSynced) {
          rowsDeleted.push({
            tableName: "workoutExercises",
            rowId: workoutExercise.id,
          });
        }
      }
    }
    if (workoutSetsToAdd.length > 0) {
      await tx.insert(sets).values(workoutSetsToAdd);
    }
    await tx
      .update(sessions)
      .set({
        updatedWorkoutAt: new Date().toISOString(),
      })
      .where(eq(sessions.id, sessionId));
    await tx
      .update(workouts)
      .set({
        exerciseCount: session.exerciseCount,
        setCount: session.setCount,
      })
      .where(eq(workouts.id, workout.id));
    if (rowsDeleted.length > 0) {
      await insertDeletedRows(rowsDeleted);
    }
  });
}

export async function updateSet(set: updateSetInput) {
  await db
    .update(sets)
    .set({
      setNumber: set.setNumber,
      targetReps: set.targetReps,
      targetWeight: set.targetWeight,
    })
    .where(eq(sets.id, set.id));
}

export async function deleteWorkout(id: string) {
  await db
    .delete(workouts)
    .where(eq(workouts.id, id))
    .returning()
    .then(async ([workout]) => {
      if (workout && workout.isSynced) {
        await insertDeletedRows([{ tableName: "workouts", rowId: workout.id }]);
      }
    });
}

export async function getWorkoutByName(name: string) {
  return await db.query.workouts.findFirst({
    where: sql`${workouts.name} COLLATE NOCASE = ${name}`,
  });
}

export async function getWorkoutsToSync(): Promise<WorkoutTypes.Workout[]> {
  return await db.query.workouts.findMany({
    where: eq(workouts.isSynced, false),
  });
}

export async function getWorkoutExercisesToSync(): Promise<
  WorkoutTypes.WorkoutExercise[]
> {
  return await db.query.workoutExercises.findMany({
    where: eq(workoutExercises.isSynced, false),
  });
}

export async function getSetsToSync(): Promise<WorkoutTypes.Set[]> {
  return await db.query.sets.findMany({
    where: eq(sets.isSynced, false),
  });
}

export async function updateWorkoutsSynced() {
  await db.update(workouts).set({
    isSynced: true,
  }).where(eq(workouts.isSynced, false));
}

export async function updateWorkoutExercisesSynced() {
  await db.update(workoutExercises).set({
    isSynced: true,
  }).where(eq(workoutExercises.isSynced, false));
}

export async function updateSetsSynced() {
  await db.update(sets).set({
    isSynced: true,
  }).where(eq(sets.isSynced, false));
}
