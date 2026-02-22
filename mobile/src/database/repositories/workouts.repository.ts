import { db } from "../database";
import { workouts, workoutExercises, sets } from "../schema/schemas";
import * as Crypto from "expo-crypto";
import * as WorkoutTypes from "@shared/types/workouts.types";
import { and, eq, inArray } from "drizzle-orm";

export async function createWorkout(input: WorkoutTypes.CreateWorkoutInput) {
  if (!/^[a-zA-Z0-9\s-]+$/.test(input.name)) {
    throw new Error(
      "Workout name can only contain letters, numbers, spaces, and hyphens",
    );
  }

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

export async function getWorkouts(): Promise<WorkoutTypes.Workout[]> {
  return await db.query.workouts.findMany({
    orderBy: (workouts, { desc }) => [desc(workouts.createdAt)],
  });
}

export async function getWorkoutById(
  id: string,
): Promise<WorkoutTypes.WorkoutWithExercises | undefined> {
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

export async function updateWorkout(workout: WorkoutTypes.WorkoutWithExercises) {
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
      if (existingExerciseIds.has(we.exercise.id)) {
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

        existingExerciseIds.delete(we.exercise.id);
        exerciseCount++;
        setCount += we.sets.length;
      } else {
        const workoutExerciseId = Crypto.randomUUID();
        await tx.insert(workoutExercises).values({
          id: workoutExerciseId,
          workoutId: workout.id,
          exerciseId: we.exercise.id,
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

export async function updateSet(set: WorkoutTypes.Set) {
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
  await db.delete(workouts).where(eq(workouts.id, id));
}
