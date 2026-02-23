import {
    sqliteTable,
    text,
    integer,
    real,
    uniqueIndex,
    index,
  } from 'drizzle-orm/sqlite-core';
  
  //
  // USERS
  //
  export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    email: text('email'),
    passwordHash: text('password_hash').notNull(),
    createdAt: text('created_at').notNull()
  });
  
  //
  // BODY PARTS
  //
  export const bodyParts = sqliteTable('bodyparts', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
  }, (table) => ({
    nameUnique: uniqueIndex('bodyparts_name_unique').on(table.name),
  }));
  
  //
  // EQUIPMENT
  //
  export const equipment = sqliteTable('equipment', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
  }, (table) => ({
    nameUnique: uniqueIndex('equipment_name_unique').on(table.name),
  }));
  
  //
  // EXERCISES
  //
  export const exercises = sqliteTable('exercises', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    link: text('link'),
    info: text('info'), // JSON as string
    imageName: text('image_name'),
    bodyPartId: text('body_part_id'),
    equipmentId: text('equipment_id')
  }, (table) => ({
    nameUnique: uniqueIndex('exercises_name_unique').on(table.name),
  }));
  
  //
  // WORKOUTS
  //
  export const workouts = sqliteTable('workouts', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    userId: text('user_id'),
    isDefaultWorkout: integer('is_default_workout', { mode: 'boolean' }).notNull().default(false),
    exerciseCount: integer('exercise_count').notNull().default(0),
    setCount: integer('set_count').notNull().default(0),
    createdAt: text('created_at').notNull()
  }, (table) => ({
    userNameUnique: uniqueIndex('workouts_user_name_unique')
      .on(table.userId, table.name),
    userCreatedIdx: index('workouts_user_created_idx')
      .on(table.userId, table.createdAt),
  }));
  
  //
  // WORKOUT EXERCISES
  //
  export const workoutExercises = sqliteTable('workoutexercises', {
    id: text('id').primaryKey(),
    workoutId: text('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'restrict' }),
    order: integer('order').notNull()
  }, (table) => ({
    uniqueWorkoutExercise: uniqueIndex('workoutexercises_unique')
      .on(table.workoutId, table.exerciseId),
    orderIdx: index('workoutexercises_order_idx')
      .on(table.workoutId, table.order),
  }));
  
  //
  // SETS (Workout Sets)
  //
  export const sets = sqliteTable('sets', {
    id: text('id').primaryKey(),
    workoutExerciseId: text('workout_exercise_id').notNull().references(() => workoutExercises.id, { onDelete: 'cascade' }),
    setNumber: integer('set_number').notNull(),
    targetReps: integer('target_reps').notNull(),
    targetWeight: integer('target_weight').notNull()
  }, (table) => ({
    uniqueSet: uniqueIndex('sets_unique')
      .on(table.setNumber, table.workoutExerciseId),
    workoutExerciseIdx: index('sets_workoutexercise_idx')
      .on(table.workoutExerciseId),
  }));
  
  //
  // SESSIONS
  //
  export const sessions = sqliteTable('sessions', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    userId: text('user_id'),
    workoutId: text('workout_id').references(() => workouts.id, { onDelete: 'set null' }),
    derivedWorkoutId: text('derived_workout_id').references(() => workouts.id, { onDelete: 'set null' }),
    createdAt: text('created_at').notNull(),
    completedAt: text('completed_at'),
    sessionTime: text('session_time'),
    isSynced: integer('is_synced', { mode: 'boolean' }).notNull().default(false),
    isFromDefaultWorkout: integer('is_from_default_workout', { mode: 'boolean' }).notNull().default(false),
    exerciseCount: integer('exercise_count').notNull().default(0),
    setCount: integer('set_count').notNull().default(0),
    updatedWorkoutAt: text('updated_workout_at'),
  }, (table) => ({
    userCreatedIdx: index('sessions_user_created_idx')
      .on(table.userId, table.createdAt),
  }));
  
  //
  // SESSION EXERCISES
  //
  export const sessionExercises = sqliteTable('sessionexercises', {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id').notNull().references(() => exercises.id, { onDelete: 'restrict' }),
    order: integer('order').notNull()
  }, (table) => ({
    uniqueSessionExercise: uniqueIndex('sessionexercises_unique')
      .on(table.sessionId, table.exerciseId),
    orderIdx: index('sessionexercises_order_idx')
      .on(table.sessionId, table.order),
  }));
  
  //
  // SESSION SETS
  //
  export const sessionSets = sqliteTable('sessionsets', {
    id: text('id').primaryKey(),
    sessionExerciseId: text('session_exercise_id').notNull().references(() => sessionExercises.id, { onDelete: 'cascade' }),
    setNumber: integer('set_number').notNull(),
    reps: integer('reps').notNull(),
    weight: real('weight').notNull()
  }, (table) => ({
    uniqueSessionSet: uniqueIndex('sessionsets_unique')
      .on(table.setNumber, table.sessionExerciseId),
    sessionExerciseIdx: index('sessionsets_idx')
      .on(table.sessionExerciseId),
  }));
  