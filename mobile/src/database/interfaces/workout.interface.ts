import {
  Set
} from "@w2s/shared/types/workouts.types";

export interface CreateWorkoutInput {
  name: string;
  exercises: {
    exerciseId: string;
    order: number;
    restTime: number;
    sets: {
      setNumber: number;
      targetReps: number;
      targetWeight: number;
      setType: string | null;
      restTime: number;
    }[];
  }[];
}

export interface UpdateWorkoutInput {
  id: string;
  name: string;
  workoutExercises: {
    id: string;
    order: number;
    restTime: number;
    exerciseId: string;
    sets: Set[];
  }[];
}
