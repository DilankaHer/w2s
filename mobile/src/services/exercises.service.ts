import { getExercises } from "@/database/repositories/exercises.repository";
import { Exercise } from "@shared/types/exercises.types";

export async function getExercisesService(bodyPartId?: string, equipmentId?: string, search?: string): Promise<Exercise[]> {
    try {
        return await getExercises(bodyPartId, equipmentId, search);
    } catch (error) {
        throw new Error('Failed to get exercises');
    }
}