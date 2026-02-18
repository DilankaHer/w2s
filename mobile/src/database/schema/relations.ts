import { relations } from "drizzle-orm";
import { bodyParts, equipment, exercises, sessionExercises, sessions, sessionSets, sets, workoutExercises, workouts } from "./schemas";

export const exercisesRelations = relations(exercises, ({ one }) => ({
    bodyPart: one(bodyParts, {
      fields: [exercises.bodyPartId],
      references: [bodyParts.id],
    }),
    equipment: one(equipment, {
      fields: [exercises.equipmentId],
      references: [equipment.id],
    }),
  }));

  export const workoutsRelations = relations(workouts, ({ many }) => ({
    workoutExercises: many(workoutExercises),
  }));

  export const workoutExercisesRelations = relations(
    workoutExercises,
    ({ one, many }) => ({
      workout: one(workouts, {
        fields: [workoutExercises.workoutId],
        references: [workouts.id],
      }),
      exercise: one(exercises, {
        fields: [workoutExercises.exerciseId],
        references: [exercises.id],
      }),
      sets: many(sets),
    })
  );

  export const setsRelations = relations(sets, ({ one }) => ({
    workoutExercise: one(workoutExercises, {
      fields: [sets.workoutExerciseId],
      references: [workoutExercises.id],
    }),
  }));

  export const sessionsRelations = relations(sessions, ({ many, one }) => ({
    workout: one(workouts, {
      fields: [sessions.workoutId],
      references: [workouts.id],
    }),
    sessionExercises: many(sessionExercises),
  }));

  export const sessionExercisesRelations = relations(
    sessionExercises,
    ({ one, many }) => ({
      session: one(sessions, {
        fields: [sessionExercises.sessionId],
        references: [sessions.id],
      }),
      exercise: one(exercises, {
        fields: [sessionExercises.exerciseId],
        references: [exercises.id],
      }),
      sessionSets: many(sessionSets),
    })
  );

  export const sessionSetsRelations = relations(sessionSets, ({ one }) => ({
    sessionExercise: one(sessionExercises, {
      fields: [sessionSets.sessionExerciseId],
      references: [sessionExercises.id],
    }),
  }));
      