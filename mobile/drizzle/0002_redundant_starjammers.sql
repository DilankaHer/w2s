PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`user_id` text,
	`workout_id` text,
	`created_at` text NOT NULL,
	`completed_at` text,
	`session_time` text,
	`is_synced` integer DEFAULT false NOT NULL,
	`is_from_default_workout` integer DEFAULT false NOT NULL,
	`exercise_count` integer DEFAULT 0 NOT NULL,
	`set_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "name", "user_id", "workout_id", "created_at", "completed_at", "session_time", "is_synced", "is_from_default_workout", "exercise_count", "set_count") SELECT "id", "name", "user_id", "workout_id", "created_at", "completed_at", "session_time", "is_synced", "is_from_default_workout", "exercise_count", "set_count" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `sessions_user_created_idx` ON `sessions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_sessionsets` (
	`id` text PRIMARY KEY NOT NULL,
	`session_exercise_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`reps` integer NOT NULL,
	`weight` real NOT NULL,
	FOREIGN KEY (`session_exercise_id`) REFERENCES `sessionexercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sessionsets`("id", "session_exercise_id", "set_number", "reps", "weight") SELECT "id", "session_exercise_id", "set_number", "reps", "weight" FROM `sessionsets`;--> statement-breakpoint
DROP TABLE `sessionsets`;--> statement-breakpoint
ALTER TABLE `__new_sessionsets` RENAME TO `sessionsets`;--> statement-breakpoint
CREATE UNIQUE INDEX `sessionsets_unique` ON `sessionsets` (`set_number`,`session_exercise_id`);--> statement-breakpoint
CREATE INDEX `sessionsets_idx` ON `sessionsets` (`session_exercise_id`);--> statement-breakpoint
CREATE TABLE `__new_sessionexercises` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_sessionexercises`("id", "session_id", "exercise_id", "order") SELECT "id", "session_id", "exercise_id", "order" FROM `sessionexercises`;--> statement-breakpoint
DROP TABLE `sessionexercises`;--> statement-breakpoint
ALTER TABLE `__new_sessionexercises` RENAME TO `sessionexercises`;--> statement-breakpoint
CREATE UNIQUE INDEX `sessionexercises_unique` ON `sessionexercises` (`session_id`,`exercise_id`);--> statement-breakpoint
CREATE INDEX `sessionexercises_order_idx` ON `sessionexercises` (`session_id`,`order`);--> statement-breakpoint
CREATE TABLE `__new_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`target_reps` integer NOT NULL,
	`target_weight` integer NOT NULL,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workoutexercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sets`("id", "workout_exercise_id", "set_number", "target_reps", "target_weight") SELECT "id", "workout_exercise_id", "set_number", "target_reps", "target_weight" FROM `sets`;--> statement-breakpoint
DROP TABLE `sets`;--> statement-breakpoint
ALTER TABLE `__new_sets` RENAME TO `sets`;--> statement-breakpoint
CREATE UNIQUE INDEX `sets_unique` ON `sets` (`set_number`,`workout_exercise_id`);--> statement-breakpoint
CREATE INDEX `sets_workoutexercise_idx` ON `sets` (`workout_exercise_id`);--> statement-breakpoint
CREATE TABLE `__new_workoutexercises` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_workoutexercises`("id", "workout_id", "exercise_id", "order") SELECT "id", "workout_id", "exercise_id", "order" FROM `workoutexercises`;--> statement-breakpoint
DROP TABLE `workoutexercises`;--> statement-breakpoint
ALTER TABLE `__new_workoutexercises` RENAME TO `workoutexercises`;--> statement-breakpoint
CREATE UNIQUE INDEX `workoutexercises_unique` ON `workoutexercises` (`workout_id`,`exercise_id`);--> statement-breakpoint
CREATE INDEX `workoutexercises_order_idx` ON `workoutexercises` (`workout_id`,`order`);