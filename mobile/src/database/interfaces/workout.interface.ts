import {
  Set
} from "@w2s/shared/types/workouts.types";

export interface CreateWorkoutInput {
  name: string;
  exercises: {
    exerciseId: string;
    order: number;
    sets: {
      setNumber: number;
      targetReps: number;
      targetWeight: number;
    }[];
  }[];
}

export interface UpdateWorkoutInput {
  id: string;
  name: string;
  workoutExercises: {
    id: string;
    order: number;
    exerciseId: string;
    sets: Set[];
  }[];
}

export interface updateSetInput {
  id: string;
  setNumber: number;
  targetReps: number;
  targetWeight: number;
}
