import { trpc } from "@/api/client";
import { getDeletedRows } from "@/database/repositories/delete-rows.repository";
import { getExercisesToSync } from "@/database/repositories/exercises.repository";
import { getSessionExercisesToSync, getSessionSetsToSync, getSessionsToSync } from "@/database/repositories/sessions.repository";
import { getUser } from "@/database/repositories/user.repository";
import { getSetsToSync, getWorkoutExercisesToSync, getWorkoutsToSync } from "@/database/repositories/workouts.repository";

export async function syncService() {
    const user = await getUser();
    const rowsDeleted = await getDeletedRows();
    const workoutstoSync = await getWorkoutsToSync();
    const workoutExercisesToSync = await getWorkoutExercisesToSync();
    const setsToSync = await getSetsToSync();
    const exercisesToSync = await getExercisesToSync();
    const sessionsToSync = await getSessionsToSync();
    const sessionExercisesToSync = await getSessionExercisesToSync();
    const sessionSetsToSync = await getSessionSetsToSync();
    try {
       if (exercisesToSync.length > 0) {
        await trpc.exercises.syncExercises.query(exercisesToSync);
       }
    } catch (error) {
        throw new Error('Failed to sync');
    }
}