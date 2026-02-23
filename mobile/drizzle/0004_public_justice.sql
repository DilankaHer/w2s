PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`user_id` text,
	`workout_id` text,
	`derived_workout_id` text,
	`created_at` text NOT NULL,
	`completed_at` text,
	`session_time` text,
	`is_synced` integer DEFAULT false NOT NULL,
	`is_from_default_workout` integer DEFAULT false NOT NULL,
	`exercise_count` integer DEFAULT 0 NOT NULL,
	`set_count` integer DEFAULT 0 NOT NULL,
	`updated_workout_at` text,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`derived_workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "name", "user_id", "workout_id", "derived_workout_id", "created_at", "completed_at", "session_time", "is_synced", "is_from_default_workout", "exercise_count", "set_count", "updated_workout_at") SELECT "id", "name", "user_id", "workout_id", "derived_workout_id", "created_at", "completed_at", "session_time", "is_synced", "is_from_default_workout", "exercise_count", "set_count", "updated_workout_at" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `sessions_user_created_idx` ON `sessions` (`user_id`,`created_at`);