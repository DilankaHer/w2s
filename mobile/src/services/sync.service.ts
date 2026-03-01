import { trpc } from "@/api/client";
import { deleteDeletedRows, getDeletedRows } from "@/database/repositories/delete-rows.repository";
import {
  getExercisesToSync,
  updateExercise,
  updateExercisesSynced,
} from "@/database/repositories/exercises.repository";
import {
  getSessionsToSync,
  updateSessionsSynced,
} from "@/database/repositories/sessions.repository";
import { getUser } from "@/database/repositories/user.repository";
import {
  getSetsToSync,
  getWorkoutExercisesToSync,
  getWorkoutsToSync,
  updateWorkoutExercisesSynced,
  updateWorkoutsSynced,
  updateSetsSynced,
} from "@/database/repositories/workouts.repository";

export async function syncService() {

  const user = await getUser();
  const rowsDeleted = await getDeletedRows();
  const workoutsToSync = await getWorkoutsToSync();
  const workoutExercisesToSync = await getWorkoutExercisesToSync();
  const setsToSync = await getSetsToSync();
  const exercisesToSync = await getExercisesToSync();
  const sessionsToSync = await getSessionsToSync();
  try {
    if (rowsDeleted.length > 0) {
      await trpc.deleteRows.deleteDeletedRows.query(rowsDeleted);
      await deleteDeletedRows();
    }
    if (exercisesToSync.length > 0) {
      await trpc.exercises.syncExercises.query(exercisesToSync);
      await updateExercisesSynced();
    }
    if (workoutsToSync.length > 0) {
      await trpc.workouts.syncWorkouts.query(workoutsToSync);
      await updateWorkoutsSynced();
    }
    if (workoutExercisesToSync.length > 0) {
      await trpc.workouts.syncWorkoutExercises.query(workoutExercisesToSync);
      await updateWorkoutExercisesSynced();
    }
    if (setsToSync.length > 0) {
      await trpc.workouts.syncSets.query(setsToSync);
      await updateSetsSynced();
    }
    if (sessionsToSync.length > 0) {
      await trpc.sessions.syncSessions.query(sessionsToSync);
      await updateSessionsSynced();
    }
  } catch (error) {
    throw new Error("Failed to sync");
  }
}
