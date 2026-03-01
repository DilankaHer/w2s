import { createWorkout, createWorkoutBySession, deleteWorkout, getWorkoutById, getWorkoutByName, getWorkouts, updateSet, updateWorkout, updateWorkoutBySession } from '../database/repositories/workouts.repository'
import * as dbTypes from '../database/database.types'
import { CreateWorkoutInput, updateSetInput, UpdateWorkoutInput } from '@/database/interfaces/workout.interface';

export const getWorkoutsService = async (): Promise<dbTypes.Workouts> => {
    try {
        return await getWorkouts();
    } catch (error) {
        throw new Error('Failed to get workouts');
    }
}

export const getWorkoutByIdService = async (id: string): Promise<dbTypes.WorkoutById> => {
    try {   
        return await getWorkoutById(id);
    } catch (error) {
        throw new Error('Failed to get workout details');
    }
}

export const createWorkoutService = async (workout: CreateWorkoutInput): Promise<string> => {
    if (!/^[a-zA-Z0-9\s-]+$/.test(workout.name)) {
        throw new Error(
          "Workout name can only contain letters, numbers, spaces, and hyphens",
        );
      }
    try {
        await createWorkout(workout);
        return "Workout created successfully";
    } catch (error) {
        throw new Error('Failed to create workout');
    }
}

export const createWorkoutBySessionService = async (sessionId: string, name: string): Promise<string> => {
    if (!/^[a-zA-Z0-9\s-]+$/.test(name)) {
        throw new Error(
          "Workout name can only contain letters, numbers, spaces, and hyphens",
        );
      }
    try {
        await createWorkoutBySession(sessionId, name);
        return "Workout created successfully";
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to create workout by session');
    }
}

export const updateWorkoutService = async (workout: UpdateWorkoutInput): Promise<string> => {
    try {
        await updateWorkout(workout);
        return "Workout updated successfully";
    } catch (error) {
        throw new Error('Failed to update workout');
    }
}

export const updateWorkoutBySessionService = async (sessionId: string): Promise<string> => {
    try {
        await updateWorkoutBySession(sessionId);
        return "Workout updated successfully";
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to update workout by session');
    }
}

export const updateSetService = async (set: updateSetInput): Promise<void> => {
    try {
        await updateSet(set);
    } catch (error) {
        throw new Error('Failed to update set');
    }
}

export const deleteWorkoutService = async (id: string): Promise<string> => {
    try {
        await deleteWorkout(id);
        return "Workout deleted successfully";
    } catch (error) {
        throw new Error('Failed to delete workout');
    }
}

export const checkWorkoutNameExistsService = async (name: string): Promise<boolean> => {
    try {
        const workout = await getWorkoutByName(name.trim());
        return !!workout;
    } catch (error) {
        throw new Error('Failed to check workout name exists');
    }
}