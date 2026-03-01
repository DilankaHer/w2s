import { createExercise, deleteExercise, getBodyParts, getEquipment, getExerciseById, getExerciseByName, getExercises, getExercisesToSync, updateExercise } from "@/database/repositories/exercises.repository";
import * as dbTypes from "@/database/database.types";
import { CreateExerciseInput, UpdateExerciseInput } from "@/database/interfaces/exercise.interface";
import * as ExerciseTypes from "@w2s/shared/types/exercises.types";

export async function getExercisesService(bodyPartId?: string, equipmentId?: string, search?: string): Promise<dbTypes.Exercises> {
    try {
        return await getExercises(bodyPartId, equipmentId, search);
    } catch (error) {
        throw new Error('Failed to get exercises');
    }
}

export async function getExerciseByIdService(id: string): Promise<dbTypes.ExerciseById> {
    try {
        return await getExerciseById(id);
    } catch (error) {
        throw new Error('Failed to get exercise by id');
    }
}

export async function checkExerciseNameExistsService(name: string): Promise<boolean> {
    try {
        const exercise = await getExerciseByName(name.trim());
        return !!exercise;
    } catch (error) {
        throw new Error('Failed to check exercise name exists');
    }
}

export async function createExerciseService(exercise: CreateExerciseInput): Promise<dbTypes.ExerciseCreated> {
    try {
        return await createExercise(exercise);
    } catch (error) {
        throw new Error('Failed to create exercise');
    }
}

export async function updateExerciseService(exercise: UpdateExerciseInput): Promise<dbTypes.ExerciseUpdated> {
    try {
        return await updateExercise(exercise);
    } catch (error) {
        throw new Error('Failed to update exercise');
    }
}

export async function getBodyPartsService(): Promise<dbTypes.BodyParts> {
    try {
        return await getBodyParts();
    } catch (error) {
        throw new Error('Failed to get body parts');
    }
}

export async function getEquipmentService(): Promise<dbTypes.Equipment> {
    try {
        return await getEquipment();
    } catch (error) {
        throw new Error('Failed to get equipment');
    }
}

export async function deleteExerciseService(id: string): Promise<string> {
    try {
        await deleteExercise(id);
        return 'Exercise deleted successfully';
    } catch (error) {
        throw new Error('Failed to delete exercise');
    }
}

export async function getExercisesToSyncService(): Promise<ExerciseTypes.Exercise[]> {
    try {
        return await getExercisesToSync();
    } catch (error) {
        throw new Error('Failed to get exercises to sync');
    }
}