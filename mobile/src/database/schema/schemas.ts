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
    isDefaultTemplate: integer('is_default_template', { mode: 'boolean' }).default(false),
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
    workoutId: text('workout_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    order: integer('order').notNull()
  }, (table) => ({
    uniqueWorkoutExercise: uniqueIndex('workoutexercises_unique')
      .on(table.workoutId, table.exerciseId),
    orderIdx: index('workoutexercises_order_idx')
      .on(table.workoutId, table.order),
  }));
  
  //
  // SETS (Workout Template Sets)
  //
  export const sets = sqliteTable('sets', {
    id: text('id').primaryKey(),
    workoutExerciseId: text('workout_exercise_id').notNull(),
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
    workoutId: text('workout_id'),
    createdAt: text('created_at').notNull(),
    completedAt: text('completed_at'),
    sessionTime: text('session_time'),
    isSyncedOnce: integer('is_synced_once', { mode: 'boolean' }).default(false),
    isFromDefaultTemplate: integer('is_from_default_template', { mode: 'boolean' }).default(false)
  }, (table) => ({
    userCreatedIdx: index('sessions_user_created_idx')
      .on(table.userId, table.createdAt),
  }));
  
  //
  // SESSION EXERCISES
  //
  export const sessionExercises = sqliteTable('sessionexercises', {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
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
    sessionExerciseId: text('session_exercise_id').notNull(),
    setNumber: integer('set_number').notNull(),
    reps: integer('reps'),
    weight: real('weight')
  }, (table) => ({
    uniqueSessionSet: uniqueIndex('sessionsets_unique')
      .on(table.setNumber, table.sessionExerciseId),
    sessionExerciseIdx: index('sessionsets_idx')
      .on(table.sessionExerciseId),
  }));
  