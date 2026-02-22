import type * as WorkoutTypes from '@shared/types/workouts.types'
import { createWorkout, deleteWorkout, getWorkoutById, getWorkouts, updateSet, updateWorkout } from '../database/repositories/workouts.repository'

export const getWorkoutsService = async (): Promise<WorkoutTypes.Workout[]> => {
    try {
        return await getWorkouts();
    } catch (error) {
        throw new Error('Failed to get workouts');
    }
}

export const getWorkoutByIdService = async (id: string): Promise<WorkoutTypes.WorkoutWithExercises | undefined> => {
    try {   
        return await getWorkoutById(id);
    } catch (error) {
        throw new Error('Failed to get workout details');
    }
}

export const createWorkoutService = async (workout: WorkoutTypes.CreateWorkoutInput): Promise<string> => {
    try {
        return await createWorkout(workout);
    } catch (error) {
        throw new Error('Failed to create workout');
    }
}

export const updateWorkoutService = async (workout: WorkoutTypes.WorkoutWithExercises): Promise<void> => {
    try {
        await updateWorkout(workout);
    } catch (error) {
        throw new Error('Failed to update workout');
    }
}

export const updateSetService = async (set: WorkoutTypes.Set): Promise<void> => {
    try {
        await updateSet(set);
    } catch (error) {
        throw new Error('Failed to update set');
    }
}

export const deleteWorkoutService = async (id: string): Promise<void> => {
    try {
        await deleteWorkout(id);
    } catch (error) {
        throw new Error('Failed to delete workout');
    }
}