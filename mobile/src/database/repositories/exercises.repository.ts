import { db } from "../database";
import { and, eq, like } from "drizzle-orm";
import { exercises } from "../schema/schemas";
import * as SharedTypes from "@shared/types/exercises.types";

export async function getExercises(bodyPartId?: string, equipmentId?: string, search?: string): Promise<SharedTypes.Exercise[]> {
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
        with: {
            bodyPart: true,
            equipment: true,
        },
    })
}