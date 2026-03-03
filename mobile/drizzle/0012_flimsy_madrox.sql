PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sessionsets` (
	`id` text PRIMARY KEY NOT NULL,
	`session_exercise_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`reps` integer NOT NULL,
	`weight` real NOT NULL,
	`set_type` text,
	`rest_time` integer DEFAULT 120000 NOT NULL,
	`is_synced` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`session_exercise_id`) REFERENCES `sessionexercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sessionsets`("id", "session_exercise_id", "set_number", "reps", "weight", "set_type", "rest_time", "is_synced") SELECT "id", "session_exercise_id", "set_number", "reps", "weight", "set_type", "rest_time", "is_synced" FROM `sessionsets`;--> statement-breakpoint
DROP TABLE `sessionsets`;--> statement-breakpoint
ALTER TABLE `__new_sessionsets` RENAME TO `sessionsets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `sessionsets_unique` ON `sessionsets` (`set_number`,`session_exercise_id`);--> statement-breakpoint
CREATE INDEX `sessionsets_idx` ON `sessionsets` (`session_exercise_id`);--> statement-breakpoint
CREATE TABLE `__new_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`target_reps` integer NOT NULL,
	`target_weight` integer NOT NULL,
	`set_type` text,
	`rest_time` integer DEFAULT 120000 NOT NULL,
	`is_synced` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workoutexercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_sets`("id", "workout_exercise_id", "set_number", "target_reps", "target_weight", "set_type", "rest_time", "is_synced") SELECT "id", "workout_exercise_id", "set_number", "target_reps", "target_weight", "set_type", "rest_time", "is_synced" FROM `sets`;--> statement-breakpoint
DROP TABLE `sets`;--> statement-breakpoint
ALTER TABLE `__new_sets` RENAME TO `sets`;--> statement-breakpoint
CREATE UNIQUE INDEX `sets_unique` ON `sets` (`set_number`,`workout_exercise_id`);--> statement-breakpoint
CREATE INDEX `sets_workoutexercise_idx` ON `sets` (`workout_exercise_id`);