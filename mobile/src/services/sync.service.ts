import { hasStoredAuth, trpc } from "@/api/client";
import {
  deleteDeletedRows,
  getDeletedRows,
} from "@/database/repositories/delete-rows.repository";
import {
  getExercisesToSync,
  updateExercisesSynced,
} from "@/database/repositories/exercises.repository";
import {
  getSessionsToSync,
  updateSessionsSynced,
} from "@/database/repositories/sessions.repository";
import {
  getUser,
  getUserToSync,
  updateUserSynced,
} from "@/database/repositories/user.repository";
import {
  getSetsToSync,
  getWorkoutExercisesToSync,
  getWorkoutsToSync,
  updateWorkoutExercisesSynced,
  updateWorkoutsSynced,
  updateSetsSynced,
} from "@/database/repositories/workouts.repository";

interface SyncResult {
  status: 'sync_success' | 'sync_failed';
  message: string;
}

export async function syncService() {
  const user = await getUser();
  if (!user) {
    return { status: 'sync_failed', message: 'Create a profile first' };
  }
  if (!(await hasStoredAuth())) {
    return { status: 'sync_failed', message: 'Sign in required' };
  }

  const userToSync = await getUserToSync();
  const rowsDeleted = await getDeletedRows();
  const workoutsToSync = await getWorkoutsToSync();
  const workoutExercisesToSync = await getWorkoutExercisesToSync();
  const setsToSync = await getSetsToSync();
  const exercisesToSync = await getExercisesToSync();
  const sessionsToSync = await getSessionsToSync();
  try {
    if (
      !userToSync &&
      rowsDeleted.length === 0 &&
      exercisesToSync.length === 0 &&
      workoutsToSync.length === 0 &&
      workoutExercisesToSync.length === 0 &&
      setsToSync.length === 0 &&
      sessionsToSync.length === 0
    ) {
      return { status: 'sync_success', message: 'Your data is already up to date' };
    }
    if (userToSync) {
      await trpc.users.syncUser.mutate(userToSync);
      await updateUserSynced();
    }
    if (rowsDeleted.length > 0) {
      await trpc.deleteRows.deleteDeletedRows.mutate(rowsDeleted);
      await deleteDeletedRows();
    }
    if (exercisesToSync.length > 0) {
      await trpc.exercises.syncExercises.mutate(exercisesToSync);
      await updateExercisesSynced();
    }
    if (workoutsToSync.length > 0) {
      await trpc.workouts.syncWorkouts.mutate(workoutsToSync);
      await updateWorkoutsSynced();
    }
    if (workoutExercisesToSync.length > 0) {
      await trpc.workouts.syncWorkoutExercises.mutate(workoutExercisesToSync);
      await updateWorkoutExercisesSynced();
    }
    if (setsToSync.length > 0) {
      await trpc.workouts.syncSets.mutate(setsToSync);
      await updateSetsSynced();
    }
    if (sessionsToSync.length > 0) {
      await trpc.sessions.syncSessions.mutate(sessionsToSync);
      await updateSessionsSynced();
    }
    return { status: 'sync_success', message: 'Your data has been synced' };
  } catch (error) {
    console.error(error);
    return { status: 'sync_failed', message: 'Failed to sync' };
  }
}
