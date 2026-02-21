ALTER TABLE `sessions` RENAME COLUMN "is_from_default_template" TO "is_from_default_workout";--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`user_id` text,
	`is_default_workout` integer DEFAULT false NOT NULL,
	`exercise_count` integer DEFAULT 0 NOT NULL,
	`set_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_workouts`("id", "name", "user_id", "is_default_workout", "exercise_count", "set_count", "created_at") SELECT "id", "name", "user_id", "is_default_workout", "exercise_count", "set_count", "created_at" FROM `workouts`;--> statement-breakpoint
DROP TABLE `workouts`;--> statement-breakpoint
ALTER TABLE `__new_workouts` RENAME TO `workouts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `workouts_user_name_unique` ON `workouts` (`user_id`,`name`);--> statement-breakpoint
CREATE INDEX `workouts_user_created_idx` ON `workouts` (`user_id`,`created_at`);