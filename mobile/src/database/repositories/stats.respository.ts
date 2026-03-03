import { count, sum } from "drizzle-orm";
import { db } from "../database";
import { sessions, workouts } from "../schema/schemas";

export async function getTotalExercises() {
    const result = await db
      .select({
        total: sum(workouts.exerciseCount),
      })
      .from(workouts);
  
    return result[0]?.total ?? 0;
  }

  export async function getSessionsPerWeek() {
    const result = await db
      .select({
        total: count(sessions.id),
      })
      .from(sessions);
  
    return result[0]?.total ?? 0;
  }