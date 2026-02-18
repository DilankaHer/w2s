import { db } from "../database";
import { workouts, workoutExercises, sets } from "../schema/schemas";
import * as Crypto from "expo-crypto";

export async function createWorkout(input: {
    name: string;
    exercises: {
        exerciseId: string;
        order: number;
        sets: {
            setNumber: number;
            targetReps: number;
            targetWeight: number;
        }[];
    }[];
}) {
    if (!/^[a-zA-Z0-9\s-]+$/.test(input.name)) {
        throw new Error(
            "Workout name can only contain letters, numbers, spaces, and hyphens"
        );
    }

    const workoutId = Crypto.randomUUID();

    await db.transaction(async (tx) => {
        await tx.insert(workouts).values({
            id: workoutId,
            name: input.name,
            isDefaultTemplate: false,
            createdAt: new Date().toISOString(),
        });

        for (const exercise of input.exercises) {
            const workoutExerciseId = Crypto.randomUUID();;

            await tx.insert(workoutExercises).values({
                id: workoutExerciseId,
                workoutId,
                exerciseId: exercise.exerciseId,
                order: exercise.order,
            });

            await tx.insert(sets).values(
                exercise.sets.map((set) => ({
                    id: Crypto.randomUUID(),
                    workoutExerciseId: workoutExerciseId,
                    setNumber: set.setNumber,
                    targetReps: set.targetReps,
                    targetWeight: set.targetWeight,
                }))
            );
        }
    });

    return workoutId;
}

export async function getWorkouts() {
    return db.query.workouts.findMany({
        with: {
            workoutExercises: {
                with: {
                    exercise: true,
                    sets: {
                        orderBy: (sets, { asc }) => [asc(sets.setNumber)],
                    },
                },
                orderBy: (we, { asc }) => [asc(we.order)],
            },
        },
        orderBy: (workouts, { desc }) => [desc(workouts.createdAt)],
    });
}

export async function getWorkoutById(id: string) {
    return db.query.workouts.findFirst({
        where: (workouts, { eq }) => eq(workouts.id, id),
        with: {
            workoutExercises: {
                with: {
                    exercise: true,
                    sets: {
                        orderBy: (sets, { asc }) => [asc(sets.setNumber)],
                    },
                },
                orderBy: (we, { asc }) => [asc(we.order)],
            },
        },
    });
}
