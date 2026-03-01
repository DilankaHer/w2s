import { createExercise, getBodyParts, getEquipment, getExerciseById, getExerciseByName, getExercises, updateExercise } from "./repositories/exercises.repository";
import { createSession, getSessionById, getSessions, updateSession } from "./repositories/sessions.repository";
import { createWorkout, deleteWorkout, getWorkoutById, getWorkoutByName, getWorkouts, updateWorkout } from "./repositories/workouts.repository";
import { createUser, getUser, updateUser } from "./repositories/user.repository";

export type Workouts = Awaited<ReturnType<typeof getWorkouts>>;
export type WorkoutById = Awaited<ReturnType<typeof getWorkoutById>>;
export type WorkoutCreated = Awaited<ReturnType<typeof createWorkout>>;
export type WorkoutUpdated = Awaited<ReturnType<typeof updateWorkout>>;
export type WorkoutDeleted = Awaited<ReturnType<typeof deleteWorkout>>;
export type WorkoutByName = Awaited<ReturnType<typeof getWorkoutByName>>;

export type Sessions = Awaited<ReturnType<typeof getSessions>>;
export type SessionById = Awaited<ReturnType<typeof getSessionById>>;
export type SessionCreated = Awaited<ReturnType<typeof createSession>>;
export type SessionUpdated = Awaited<ReturnType<typeof updateSession>>;


export type Exercises = Awaited<ReturnType<typeof getExercises>>;
export type ExerciseById = Awaited<ReturnType<typeof getExerciseById>>;
export type ExerciseByName = Awaited<ReturnType<typeof getExerciseByName>>;
export type ExerciseCreated = Awaited<ReturnType<typeof createExercise>>;
export type ExerciseUpdated = Awaited<ReturnType<typeof updateExercise>>;

export type BodyParts = Awaited<ReturnType<typeof getBodyParts>>;
export type Equipment = Awaited<ReturnType<typeof getEquipment>>;

export type User = Awaited<ReturnType<typeof getUser>>;
export type UserCreated = Awaited<ReturnType<typeof createUser>>;
export type UserUpdated = Awaited<ReturnType<typeof updateUser>>;