ALTER TABLE `sessionsets` ADD `set_type` text;--> statement-breakpoint
ALTER TABLE `sessionsets` ADD `rest_time` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sets` ADD `set_type` text;--> statement-breakpoint
ALTER TABLE `sets` ADD `rest_time` integer DEFAULT 0 NOT NULL;