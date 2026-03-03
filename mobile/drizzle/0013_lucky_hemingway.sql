ALTER TABLE `sessionexercises` ADD `rest_time` integer DEFAULT 120000 NOT NULL;--> statement-breakpoint
ALTER TABLE `workoutexercises` ADD `rest_time` integer DEFAULT 120000 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessionsets` DROP COLUMN `rest_time`;--> statement-breakpoint
ALTER TABLE `sets` DROP COLUMN `rest_time`;