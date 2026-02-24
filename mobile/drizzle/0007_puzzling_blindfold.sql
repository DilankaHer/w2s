DROP INDEX `sessions_user_created_idx`;--> statement-breakpoint
CREATE INDEX `sessions_user_created_idx` ON `sessions` (`created_at`);--> statement-breakpoint
ALTER TABLE `sessions` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `workouts_user_name_unique`;--> statement-breakpoint
DROP INDEX `workouts_user_created_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `workouts_user_name_unique` ON `workouts` ("name" COLLATE NOCASE);--> statement-breakpoint
CREATE INDEX `workouts_user_created_idx` ON `workouts` (`created_at`);--> statement-breakpoint
ALTER TABLE `workouts` DROP COLUMN `user_id`;