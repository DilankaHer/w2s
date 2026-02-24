DROP INDEX `exercises_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_name_unique` ON `exercises` ("name" COLLATE NOCASE);