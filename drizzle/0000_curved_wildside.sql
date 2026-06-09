CREATE TABLE `prayer_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`date` text NOT NULL,
	`prayer` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	`dirty` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prayer_logs_date_prayer_unique` ON `prayer_logs` (`date`,`prayer`);