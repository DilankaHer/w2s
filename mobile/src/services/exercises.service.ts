import { createExercise, deleteExercise, getBodyParts, getEquipment, getExerciseById, getExerciseByName, getExercises, updateExercise } from "@/database/repositories/exercises.repository";
import * as ExerciseTypes from "@shared/types/exercises.types";

export async function getExercisesService(bodyPartId?: string, equipmentId?: string, search?: string): Promise<ExerciseTypes.Exercise[]> {
    try {
        return await getExercises(bodyPartId, equipmentId, search);
    } catch (error) {
        throw new Error('Failed to get exercises');
    }
}

export async function getExerciseByIdService(id: string): Promise<ExerciseTypes.Exercise | undefined> {
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

export async function createExerciseService(exercise: ExerciseTypes.Exercise): Promise<ExerciseTypes.Exercise | undefined> {
    try {
        return await createExercise(exercise);
    } catch (error) {
        throw new Error('Failed to create exercise');
    }
}

export async function updateExerciseService(exercise: ExerciseTypes.Exercise): Promise<ExerciseTypes.Exercise | undefined> {
    try {
        return await updateExercise(exercise);
    } catch (error) {
        throw new Error('Failed to update exercise');
    }
}

export async function getBodyPartsService(): Promise<ExerciseTypes.BodyPart[]> {
    try {
        return await getBodyParts();
    } catch (error) {
        throw new Error('Failed to get body parts');
    }
}

export async function getEquipmentService(): Promise<ExerciseTypes.Equipment[]> {
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