import { getWorkoutById, getWorkouts } from '../database/repositories/workouts.repository'

export const getWorkoutsService = async () => {
    const workouts = await getWorkouts();
    return workouts;
}

export const getWorkoutByIdService = async (id: string) => {
    const workout = await getWorkoutById(id);
    return workout;
}