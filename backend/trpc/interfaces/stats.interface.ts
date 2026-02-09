import z from "zod";

export interface StatsResponse {
    favoriteWorkout: string;
    totalSessions: number;
    totalExercises: number;
}