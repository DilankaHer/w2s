import type { Workout, WorkoutWithExercises } from '@shared/types'
import { getWorkoutById, getWorkouts } from '../database/repositories/workouts.repository'

export const getWorkoutsService = async (): Promise<Workout[]> => {
    const workouts = await getWorkouts();
    return workouts;
}

export const getWorkoutByIdService = async (id: string): Promise<WorkoutWithExercises | undefined> => {
    const workout = await getWorkoutById(id);
    return workout;
}