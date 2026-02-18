import { getWorkouts } from "@/database/repositories/workouts.repository";

export const getWorkoutsService = async () => {
    return await getWorkouts();
}