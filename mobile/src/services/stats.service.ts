import { getTotalExercises } from "@/database/repositories/stats.respository";

interface Stats {
    totalExercises: number;
    totalSessions: number;
    totalWorkouts: number;
    totalSets: number;
    totalReps: number;
    totalWeight: number;
    totalDistance: number;
    totalTime: number;
    sessionsPerWeek: number;
}

export async function getStatsService() {
    try {
        const totalExercises = await getTotalExercises();
        // const sessionsPerWeek = await getSessionsPerWeek();
        return {
            totalExercises,
        };
    } catch (error) {
        throw new Error('Failed to get stats');
    }
}