import { SessionSet } from "@w2s/shared/types/sessions.types";

export interface UpdateSessionInput {
    id: string;
    name: string;
    completedAt: string;
    sessionTime: string;
    sessionExercises: {
        id: string;
        order: number;
        exerciseId: string;
        sessionSets: SessionSet[];
    }[];
}