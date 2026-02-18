CREATE TABLE `bodyparts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bodyparts_name_unique` ON `bodyparts` (`name`);--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `equipment_name_unique` ON `equipment` (`name`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`link` text,
	`info` text,
	`image_name` text,
	`body_part_id` text,
	`equipment_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_name_unique` ON `exercises` (`name`);--> statement-breakpoint
CREATE TABLE `sessionexercises` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessionexercises_unique` ON `sessionexercises` (`session_id`,`exercise_id`);--> statement-breakpoint
CREATE INDEX `sessionexercises_order_idx` ON `sessionexercises` (`session_id`,`order`);--> statement-breakpoint
CREATE TABLE `sessionsets` (
	`id` text PRIMARY KEY NOT NULL,
	`session_exercise_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`reps` integer,
	`weight` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessionsets_unique` ON `sessionsets` (`set_number`,`session_exercise_id`);--> statement-breakpoint
CREATE INDEX `sessionsets_idx` ON `sessionsets` (`session_exercise_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`user_id` text,
	`workout_id` text,
	`created_at` text NOT NULL,
	`completed_at` text,
	`session_time` text,
	`is_synced_once` integer DEFAULT false,
	`is_from_default_template` integer DEFAULT false
);
--> statement-breakpoint
CREATE INDEX `sessions_user_created_idx` ON `sessions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`target_reps` integer NOT NULL,
	`target_weight` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sets_unique` ON `sets` (`set_number`,`workout_exercise_id`);--> statement-breakpoint
CREATE INDEX `sets_workoutexercise_idx` ON `sets` (`workout_exercise_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workoutexercises` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workoutexercises_unique` ON `workoutexercises` (`workout_id`,`exercise_id`);--> statement-breakpoint
CREATE INDEX `workoutexercises_order_idx` ON `workoutexercises` (`workout_id`,`order`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`user_id` text,
	`is_default_template` integer DEFAULT false,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workouts_user_name_unique` ON `workouts` (`user_id`,`name`);--> statement-breakpoint
CREATE INDEX `workouts_user_created_idx` ON `workouts` (`user_id`,`created_at`);