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

export async function syncService() {
  const user = await getUser();
  if (!user) {
    throw new Error("Create a profile first");
  }
  if (!(await hasStoredAuth())) {
    await trpc.users.createNewToken.query({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      isMobile: true,
    });
  }

  const userToSync = await getUserToSync();
  const rowsDeleted = await getDeletedRows();
  const workoutsToSync = await getWorkoutsToSync();
  const workoutExercisesToSync = await getWorkoutExercisesToSync();
  const setsToSync = await getSetsToSync();
  const exercisesToSync = await getExercisesToSync();
  const sessionsToSync = await getSessionsToSync();
  try {
    if (userToSync) {
      await trpc.users.syncUser.query(userToSync);
      await updateUserSynced();
    }
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
    return "Sync completed";
  } catch (error) {
    throw new Error("Failed to sync");
  }
}
