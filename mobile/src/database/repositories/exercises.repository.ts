import { db } from "../database";
import { and, eq, like, sql } from "drizzle-orm";
import { exercises } from "../schema/schemas";
import * as ExerciseTypes from "@w2s/shared/types/exercises.types";
import * as Crypto from "expo-crypto";
import { insertDeletedRows } from "./delete-rows.repository";
import { CreateExerciseInput, UpdateExerciseInput } from "../interfaces/exercise.interface";

export async function getExercises(bodyPartId?: string, equipmentId?: string, search?: string) {
    const conditions = []

    if (bodyPartId) {
      conditions.push(eq(exercises.bodyPartId, bodyPartId))
    }
  
    if (equipmentId) {
      conditions.push(eq(exercises.equipmentId, equipmentId))
    }

    if (search) {
      conditions.push(like(exercises.name, `%${search.trim()}%`))
    }
    return await db.query.exercises.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        columns: {
            id: true,
            name: true,
            isDefaultExercise: true,
        },
        with: {
            bodyPart: true,
            equipment: true,
        },
    })
}

export async function getExerciseById(id: string) {
    return await db.query.exercises.findFirst({
        where: eq(exercises.id, id),
        with: {
            bodyPart: true,
            equipment: true,
        },
    });
}

export async function getExerciseByName(name: string) {
  return await db.query.exercises.findFirst({
      where: sql`${exercises.name} COLLATE NOCASE = ${name}`,
      with: {
        bodyPart: true,
        equipment: true,
      },
  });
}

export async function createExercise(exercise: CreateExerciseInput) {
    const exerciseId = Crypto.randomUUID();
    await db.insert(exercises).values({
        id: exerciseId,
        name: exercise.name,
        bodyPartId: exercise.bodyPartId,
        equipmentId: exercise.equipmentId,
        link: exercise.link,
        info: exercise.info,
    });
    return await db.query.exercises.findFirst({
        where: eq(exercises.id, exerciseId),
        columns: {
            id: true,
            name: true,
            isDefaultExercise: true,
        },
        with: {
            bodyPart: true,
            equipment: true,
        },
    });
}

export async function updateExercise(exercise: UpdateExerciseInput) {
    await db.update(exercises).set({
        name: exercise.name,
        bodyPartId: exercise.bodyPartId,
        equipmentId: exercise.equipmentId,
        link: exercise.link,
        info: exercise.info,
        isSynced: false,
    }).where(eq(exercises.id, exercise.id));

    return await db.query.exercises.findFirst({
        where: eq(exercises.id, exercise.id),
        columns: {
            id: true,
            name: true,
            isDefaultExercise: true,
        },
        with: {
            bodyPart: true,
            equipment: true,
        },
    });
}

export async function getBodyParts() {
    return await db.query.bodyParts.findMany();
}

export async function getEquipment() {
    return await db.query.equipment.findMany();
}

export async function deleteExercise(id: string) {
    await db.delete(exercises).where(eq(exercises.id, id)).returning().then(async ([exercise]) => {
        if (exercise && exercise.isSynced) {
            await insertDeletedRows([{ tableName: 'exercises', rowId: exercise.id }]);
        }
    });
}

export async function getExercisesToSync(): Promise<ExerciseTypes.Exercise[]> {
  return await db.query.exercises.findMany({
    where: eq(exercises.isSynced, false),
  });
}